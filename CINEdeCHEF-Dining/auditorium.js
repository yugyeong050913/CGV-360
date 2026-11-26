import * as THREE from 'three';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';

// The SVG plan uses 6 cm per unit, centered at (160, 119).
const scale = 0.06;
const planX = (x) => (x - 160) * scale;
const planZ = (y) => (y - 119) * scale;
const suiteColumns = [30, 124, 218];
const suiteRows = [51, 109, 167];
const floorHeight = (row) => 0.14 + row * 0.54;
const bedWidth = 29 * scale;
const bedLength = 37 * scale;
const leftWall = planX(15);
const rightWall = planX(305);
const frontWall = planZ(8);
const backWall = planZ(230);
const ceilingHeight = 5.15;

const suites = suiteRows.flatMap((y, row) => suiteColumns.map((x, column) => ({
  x: planX(x + 36),
  z: planZ(y + 23),
  floor: floorHeight(row),
  beds: [19.5, 51.5].map((offset, side) => {
    const id = String.fromCharCode(65 + row) + String(column * 2 + side + 1).padStart(2, '0');
    return { id, eye: [planX(x + offset), floorHeight(row) + 1.18, planZ(y + 34)] };
  }),
})));
export const seating = suites.flatMap(({ beds }) => beds);
export const screenTarget = [0, 2.66, planZ(20)];

function canvasTexture(paint, anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  paint(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, anisotropy);
  return texture;
}

function makeMaterials(anisotropy) {
  const surface = (color, roughness = 0.8, map = null) =>
    new THREE.MeshStandardMaterial({ color, roughness, map });
  const woodGrain = canvasTexture((ctx) => {
    ctx.fillStyle = '#e2ac76';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i++) {
      const value = (Math.sin(i * 1.3) + Math.sin(i * 0.18) * 2 + Math.sin(i * 0.044) * 4) / 7;
      ctx.strokeStyle = value > 0 ? `rgba(255,240,214,${value * 0.26})` : `rgba(67,30,12,${-value * 0.47})`;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.bezierCurveTo(i + 3, 90, i - 4, 165, i, 256);
      ctx.stroke();
    }
  }, anisotropy);
  const weave = canvasTexture((ctx) => {
    ctx.fillStyle = '#e0dbd2';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 2) {
      ctx.fillStyle = 'rgba(66,53,45,0.14)';
      ctx.fillRect(i, 0, 1, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(0, i, 256, 1);
    }
  }, anisotropy);
  const screen = canvasTexture((ctx) => {
    const glow = ctx.createRadialGradient(128, 114, 5, 128, 126, 155);
    glow.addColorStop(0, '#748999');
    glow.addColorStop(1, '#485660');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);
  }, anisotropy);
  return {
    walls: surface(0x211c1b),
    panels: surface(0x302827),
    ceiling: surface(0x221b17),
    beam: surface(0x2b211c),
    shadow: surface(0x100e10),
    carpet: surface(0x413237, 1, weave),
    wood: surface(0xc28a56, 0.53, woodGrain),
    underWood: surface(0x574334, 0.66, woodGrain),
    gold: new THREE.MeshStandardMaterial({
      color: 0xb98a4e, metalness: 0.52, roughness: 0.41,
      emissive: 0x4e2b0c, emissiveIntensity: 0.17,
    }),
    mattress: surface(0x837d75, 0.97, weave),
    linen: surface(0xaaa397, 1, weave),
    pillow: surface(0xc8c0b1, 1, weave),
    cushion: surface(0x615853, 0.95, weave),
    throw: surface(0x625e58, 1, weave),
    lit: new THREE.MeshBasicMaterial({ color: 0xffcf88 }),
    stepLight: new THREE.MeshBasicMaterial({ color: 0x9a633a }),
    screen: new THREE.MeshBasicMaterial({ map: screen, color: 0xe1e8ed }),
  };
}

export function buildAuditorium(scene, anisotropy) {
  const materials = makeMaterials(anisotropy);
  const geometries = new Map();
  function box(parent, material, x, y, z, width, height, depth, radius = 0) {
    const key = [width, height, depth, radius].join('/');
    if (!geometries.has(key)) {
      geometries.set(key, radius
        ? new RoundedBoxGeometry(width, height, depth, 2, radius)
        : new THREE.BoxGeometry(width, height, depth));
    }
    const part = new THREE.Mesh(geometries.get(key), materials[material]);
    part.position.set(x, y, z);
    parent.add(part);
    return part;
  }

  const width = rightWall - leftWall;
  const depth = backWall - frontWall;
  const middle = (frontWall + backWall) / 2;
  scene.background = new THREE.Color(0x151114);
  scene.add(new THREE.HemisphereLight(0xffeee4, 0x7d5d55, 1.36));
  const screenFill = new THREE.DirectionalLight(0xafc8eb, 0.53);
  screenFill.position.set(0, 3.8, frontWall);
  scene.add(screenFill);

  box(scene, 'walls', 0, ceilingHeight / 2, frontWall, width, ceilingHeight, 0.18);
  box(scene, 'walls', 0, ceilingHeight / 2, backWall, width, ceilingHeight, 0.18);
  box(scene, 'ceiling', 0, ceilingHeight + 0.09, middle, width, 0.18, depth);
  box(scene, 'carpet', 0, -0.11, middle, width, 0.22, depth);

  // Three continuous viewing tiers and short intermediate aisle treads.
  for (let row = 0; row < suiteRows.length; row++) {
    const top = floorHeight(row);
    const start = planZ(suiteRows[row] - 5);
    const end = row === 2 ? backWall : planZ(suiteRows[row + 1] - 5);
    box(scene, 'carpet', 0, top / 2, (start + end) / 2, width, top, end - start);
    box(scene, 'beam', 0, top - 0.04, start - 0.015, width, 0.07, 0.045);
    for (const aisleX of [planX(113), planX(207)]) {
      box(scene, 'stepLight', aisleX, top - 0.03, start - 0.042, 0.65, 0.019, 0.013);
      if (row > 0) {
        const lower = floorHeight(row - 1);
        const tread = (lower + top) / 2;
        box(scene, 'carpet', aisleX, tread / 2, start - 0.17, 1.24, tread, 0.34);
        box(scene, 'stepLight', aisleX, tread - 0.025, start - 0.348,
          0.65, 0.016, 0.013);
      }
    }
  }

  for (const sign of [-1, 1]) {
    const x = sign * (width / 2 - 0.1);
    box(scene, 'walls', x, ceilingHeight / 2, middle, 0.2, ceilingHeight, depth);
    for (let panel = 0; panel < 9; panel++) {
      const span = depth / 9;
      const z = frontWall + (panel + 0.5) * span;
      const inset = x - sign * 0.11;
      box(scene, 'panels', inset, 2.62, z, 0.025, 4.61, span - 0.07);
      const molding = inset - sign * 0.02;
      for (const y of [0.34, 1.47, 3.65, 4.82]) {
        box(scene, 'gold', molding, y, z, 0.026, 0.026, span - 0.13);
      }
      for (const edge of [-1, 1]) {
        box(scene, 'gold', molding, 2.58, z + edge * (span - 0.13) / 2, 0.026, 4.48, 0.027);
      }
      if (panel % 2 === 1) {
        box(scene, 'beam', molding - sign * 0.04, 3.65, z, 0.16, 0.28, 0.22, 0.02);
        box(scene, 'lit', molding - sign * 0.13, 3.65, z, 0.035, 0.13, 0.11, 0.012);
        const sconce = new THREE.PointLight(0xffba77, 12, 4.25, 2);
        sconce.position.set(molding - sign * 0.27, 3.64, z);
        scene.add(sconce);
      }
    }
  }

  // Dark framed rear wall and a coffer grid with recessed gold trim.
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 1.85;
    box(scene, 'panels', x, 3.12, backWall - 0.11, 1.79, 3.74, 0.05);
    box(scene, 'gold', x, 4.97, backWall - 0.144, 1.75, 0.027, 0.027);
    box(scene, 'gold', x - 0.875, 3.12, backWall - 0.144, 0.026, 3.74, 0.027);
  }
  const tileWidth = width / 8;
  const tileDepth = depth / 7;
  for (let i = 0; i <= 8; i++) {
    box(scene, 'beam', leftWall + i * tileWidth, ceilingHeight - 0.14, middle, 0.17, 0.27, depth);
  }
  for (let j = 0; j <= 7; j++) {
    box(scene, 'beam', 0, ceilingHeight - 0.14, frontWall + j * tileDepth, width, 0.27, 0.17);
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 7; j++) {
      const x = leftWall + (i + 0.5) * tileWidth;
      const z = frontWall + (j + 0.5) * tileDepth;
      for (const side of [-1, 1]) {
        box(scene, 'gold', x + side * (tileWidth / 2 - 0.17), ceilingHeight - 0.13, z,
          0.035, 0.04, tileDepth - 0.32);
        box(scene, 'gold', x, ceilingHeight - 0.13, z + side * (tileDepth / 2 - 0.17),
          tileWidth - 0.32, 0.04, 0.035);
      }
      if ((i + j) % 2 === 0) {
        box(scene, 'lit', x, ceilingHeight - 0.051, z, 0.075, 0.04, 0.075, 0.018);
      }
    }
  }
  for (const row of [0, 1, 2]) {
    const pendant = new THREE.PointLight(0xffd2a1, 46, 9, 2);
    pendant.position.set(0, ceilingHeight - 0.28, planZ(suiteRows[row] + 23));
    scene.add(pendant);
  }

  const screenZ = screenTarget[2];
  box(scene, 'beam', 0, 0.16, screenZ, 15.35, 0.32, 1.2);
  box(scene, 'shadow', 0, screenTarget[1], screenZ, 14.88, 4.28, 0.14, 0.06);
  box(scene, 'screen', 0, screenTarget[1], screenZ + 0.079, 14.64, 4.02, 0.017);
  box(scene, 'gold', 0, 0.48, screenZ + 0.09, 14.84, 0.025, 0.045);

  for (const suite of suites) {
    const set = new THREE.Group();
    set.name = `Suite ${suite.beds[0].id} / ${suite.beds[1].id}`;
    set.position.set(suite.x, suite.floor, suite.z);
    scene.add(set);
    box(set, 'underWood', 0, 0.11, 0, 4.25, 0.2, 2.7, 0.09);
    box(set, 'wood', 0, 0.57, 1.27, 4.27, 0.95, 0.13, 0.06);

    for (const side of [-1, 1]) {
      const x = side * 2.09;
      box(set, 'wood', x, 0.53, 0.17, 0.13, 0.91, 2.28, 0.06);
      box(set, 'gold', x, 0.984, 0.17, 0.062, 0.019, 2.12, 0.008);
      const table = side * 1.76;
      box(set, 'underWood', table, 0.43, -0.89, 0.68, 0.66, 0.57, 0.04);
      box(set, 'wood', table, 0.77, -0.89, 0.72, 0.09, 0.66, 0.04);
      box(set, 'gold', table, 0.63, -0.591, 0.26, 0.027, 0.03, 0.01);
    }
    for (const seat of suite.beds) {
      const bed = new THREE.Group();
      bed.name = seat.id;
      bed.position.x = seat.eye[0] - suite.x;
      set.add(bed);
      box(bed, 'underWood', 0, 0.24, -0.025, bedWidth - 0.06, 0.21, bedLength, 0.09);
      box(bed, 'mattress', 0, 0.4, -0.035, bedWidth, 0.24, bedLength, 0.115);
      box(bed, 'linen', 0, 0.52, -0.43, bedWidth - 0.09, 0.07, 1.32, 0.032);
      box(bed, 'pillow', 0, 0.77, 0.78, 1.26, 0.18, 0.54, 0.088).rotation.x = -0.24;
      box(bed, 'cushion', -0.24, 0.865, 0.64, 0.5, 0.14, 0.37, 0.068).rotation.z = -0.12;
      box(bed, 'mattress', 0, 0.6, 0.69, bedWidth - 0.08, 0.24, 0.91, 0.115).rotation.x = -0.22;
      box(bed, 'throw', 0, 0.57, -0.84, bedWidth - 0.08, 0.045, 0.45, 0.02);
      box(bed, 'pillow', 0.3, 0.614, -0.78, 0.41, 0.07, 0.28, 0.032);
    }
  }
}
