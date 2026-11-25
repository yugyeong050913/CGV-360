import { Box3, SRGBColorSpace, TextureLoader, Vector4 } from 'three';

const panoramaUrl = new URL('./screen.jpeg', import.meta.url).href;

export async function loadPanorama() {
  const panorama = await new TextureLoader().loadAsync(panoramaUrl);
  panorama.colorSpace = SRGBColorSpace;
  panorama.anisotropy = 8;
  return panorama;
}

export function applyWallProjection({ screen: frontScreen, walls, rearX }, panorama) {
  const front = new Box3().setFromObject(frontScreen, true);
  const sideWidth = front.min.x - rearX;
  const frontWidth = front.max.z - front.min.z;
  const totalWidth = frontWidth + 2 * sideWidth;
  const height = front.max.y - front.min.y;
  const imageAspect = panorama.image.width / panorama.image.height;
  const screenAspect = totalWidth / height;
  const bounds = new Vector4(rearX, front.min.x, front.min.y, front.max.y);
  const dimensions = new Vector4(front.min.z, front.max.z, sideWidth, totalWidth);

  // Keep the source aspect ratio and center the crop across the entire panorama.
  const crop = new Vector4(
    Math.min(1, screenAspect / imageAspect),
    Math.min(1, imageAspect / screenAspect),
    0.04, // Leave a little projector black level in dark pixels.
    0.88, // Limit peak brightness in the dark room.
  );

  // Keep the shared texture discoverable by the viewer's material disposal.
  frontScreen.material.map = panorama;
  for (const material of new Set([frontScreen.material, ...walls.map((wall) => wall.material)])) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.panorama = { value: panorama };
      shader.uniforms.projectionBounds = { value: bounds };
      shader.uniforms.projectionDimensions = { value: dimensions };
      shader.uniforms.projectionCrop = { value: crop };
      shader.uniforms.projectionIsFront = { value: material === frontScreen.material };

      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 projectionWorldPosition;')
        .replace('#include <worldpos_vertex>', `
          #include <worldpos_vertex>
          projectionWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `);

      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `
          #include <common>
          varying vec3 projectionWorldPosition;
          uniform sampler2D panorama;
          uniform vec4 projectionBounds;
          uniform vec4 projectionDimensions;
          uniform vec4 projectionCrop;
          uniform bool projectionIsFront;
        `)
        .replace('#include <opaque_fragment>', `
          vec3 point = projectionWorldPosition;
          vec2 inside = step(projectionBounds.xz, point.xy) * step(point.xy, projectionBounds.yw);
          if (projectionIsFront || inside.x * inside.y > 0.0) {
            float distanceAlong = projectionDimensions.z + point.z - projectionDimensions.x;
            if (!projectionIsFront) {
              float wallDistance = clamp(point.x - projectionBounds.x, 0.0, projectionDimensions.z);
              float centerZ = (projectionDimensions.x + projectionDimensions.y) * 0.5;
              distanceAlong = point.z < centerZ ? wallDistance : projectionDimensions.w - wallDistance;
            }
            vec2 imageUV = vec2(
              distanceAlong / projectionDimensions.w,
              (point.y - projectionBounds.z) / (projectionBounds.w - projectionBounds.z)
            );
            imageUV = (imageUV - 0.5) * projectionCrop.xy + 0.5;
            vec3 frameColor = texture2D(panorama, imageUV).rgb;
            outgoingLight = mix(vec3(projectionCrop.z), frameColor, projectionCrop.w);
          }
          #include <opaque_fragment>
        `);
    };
    material.needsUpdate = true;
  }
}
