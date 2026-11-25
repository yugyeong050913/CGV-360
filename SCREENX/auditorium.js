import {
  Box3, BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, Vector3,
} from 'three';
import { rearSeating } from './cinemas.js';

const frontExtension = 4;
const firstPlatformDepth = 3.65;
const { rows: rearRows, pitch: rowPitch, rise: rowRise } = rearSeating;
const rearExtension = firstPlatformDepth + (rearRows - 1) * rowPitch;

export function expandAuditorium(model) {
  model.updateMatrixWorld(true);
  const find = (name) => model.getObjectByName(name);
  const bounds = (mesh) => new Box3().setFromObject(mesh, true);
  const wall = find('Wall_Wall_0');
  const screen = find('Screen_Screen_0');
  const rearWall = find('Wall002_WallBack_0');
  const floor = find('Floor_Floor_0');
  const tier = find('InbetweenRowFloor004_InbetweenRow_0');
  const rearRow = find('Cube021_Chair_0');

  const shell = bounds(wall);
  const frontFloor = bounds(floor);
  const oldRear = bounds(rearWall).min.x;
  const newRear = oldRear - rearExtension;
  const oldFront = bounds(find('Wall001_WallBlack_0')).max.x;
  const newFront = oldFront + frontExtension;
  const tierY = bounds(tier).max.y;
  const seats = bounds(rearRow);
  const exitStart = bounds(find('ExitWalls_ExitWalls_0')).min.x;
  const stairStart = bounds(find('StairsDown_StairsDown_0')).min.x;
  const left = shell.min.z;
  const right = shell.max.z;

  function move(mesh, dx) {
    const position = mesh.getWorldPosition(new Vector3());
    position.x += dx;
    mesh.position.copy(mesh.parent.worldToLocal(position));
  }

  for (const name of [
    'Screen_Screen_0', 'Wall001_WallBlack_0', 'Underscreen001_Underscreen_0',
    'ExitWalls_ExitWalls_0', 'StairsDown_StairsDown_0',
    'ExitSign_ExitSign_0', 'RailingExit_LP_RailingExit_0',
  ]) {
    move(find(name), frontExtension);
  }
  move(rearWall, -rearExtension);

  const rearRowPosition = rearRow.getWorldPosition(new Vector3());
  for (let row = 1; row <= rearRows; row++) {
    const nextRow = rearRow.clone();
    nextRow.name = `SCREENX rear seating row ${row}`;
    rearRow.parent.add(nextRow);
    const position = rearRowPosition.clone().add(new Vector3(-row * rowPitch, row * rowRise, 0));
    nextRow.position.copy(rearRow.parent.worldToLocal(position));
  }

  function quad(name, vertices, material, uv) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices.flat(), 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uv.flat(), 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    model.add(mesh);
    return mesh;
  }

  function horizontal(name, x0, x1, z0, z1, y, material, uvAt) {
    const points = [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]];
    quad(name, points, material, points.map(([x, , z]) => uvAt(x, z)));
  }

  const wallGeometry = wall.geometry;
  const positions = wallGeometry.getAttribute('position');
  const uvs = wallGeometry.getAttribute('uv');
  const walls = [wall];
  for (let start = 0; start < positions.count; start += 4) {
    // Match the original two planar wall sections, mirroring the edge texels
    // into each extension without stretching the wall already in the model.
    const corners = Array.from({ length: 4 }, (_, i) => {
      const index = start + i;
      return {
        point: wall.localToWorld(new Vector3().fromBufferAttribute(positions, index)),
        u: uvs.getX(index),
        v: uvs.getY(index),
      };
    });
    const rear = Math.min(...corners.map(({ point }) => point.x));
    const front = Math.max(...corners.map(({ point }) => point.x));
    for (const [edge, end] of [[rear, newRear], [front, newFront]]) {
      const extension = Math.abs(end - edge);
      const vertices = corners.map(({ point }) =>
        [Math.abs(point.x - edge) < 0.001 ? edge : end, point.y, point.z],
      );
      const uv = corners.map(({ point, u, v }) => {
        const onEdge = Math.abs(point.x - edge) < 0.001;
        const rimV = edge === rear ? 1 : 0;
        return [u, onEdge ? v : rimV + (edge === rear ? -1 : 1) * extension / (front - rear)];
      });
      // This wall uses a double-sided material in the shared GLB.
      walls.push(quad('SCREENX side wall extension', vertices, wall.material, uv));
    }
  }

  const sourceUv = floor.geometry.getAttribute('uv');
  const uValues = Array.from({ length: sourceUv.count }, (_, i) => sourceUv.getX(i));
  const vValues = Array.from({ length: sourceUv.count }, (_, i) => sourceUv.getY(i));
  const uMin = Math.min(...uValues);
  const uMax = Math.max(...uValues);
  const vMin = Math.min(...vValues);
  const vMax = Math.max(...vValues);
  const floorWidth = frontFloor.max.z - frontFloor.min.z;
  const floorDepth = frontFloor.max.x - frontFloor.min.x;

  // Mirror at the existing seam to continue the carpet at the original texel density.
  // Keep the UVs inside the part of the texture sampled by the original floor.
  function mirror(value) {
    return Math.abs(value - 2 * Math.round(value / 2));
  }

  const floorUv = (x, z) => [
    uMin + (uMax - uMin) * mirror((x - frontFloor.min.x) / floorDepth),
    vMin + (vMax - vMin) * mirror((frontFloor.max.z - z) / floorWidth),
  ];
  horizontal('SCREENX front floor extension', frontFloor.max.x, frontFloor.max.x + frontExtension,
    frontFloor.min.z, frontFloor.max.z, frontFloor.max.y, floor.material, floorUv);

  const unitUv = (x, z) => [x * 0.09035, -z * 0.09035];
  const aisle = bounds(find('InbetweenRowFloor006_InbetweenRow_0'));
  for (const [outer, inner, floorEdge] of [
    [left, -9.96, frontFloor.min.z],
    [right, 10.03, frontFloor.max.z],
  ]) {
    horizontal('SCREENX front side aisle', aisle.max.x, exitStart + frontExtension,
      Math.min(outer, inner), Math.max(outer, inner), aisle.max.y, tier.material, unitUv);
    horizontal('SCREENX front aisle landing', aisle.max.x, stairStart + frontExtension,
      Math.min(inner, floorEdge), Math.max(inner, floorEdge), frontFloor.max.y, floor.material, floorUv);
    quad('SCREENX front aisle edge', [
      [aisle.max.x, frontFloor.max.y, inner], [exitStart + frontExtension, frontFloor.max.y, inner],
      [exitStart + frontExtension, aisle.max.y, inner], [aisle.max.x, aisle.max.y, inner],
    ], tier.material, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }

  const riserMaterial = find('RowWall001_RowWall_0').material;
  function riser(name, x, y0, y1, z0, z1) {
    quad(name, [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]],
      riserMaterial, [[0, 0], [0, 1], [1, 1], [1, 0]]);
  }
  const platformLeft = seats.min.z - 0.04;
  const platformRight = seats.max.z + 0.04;
  const stairDepth = 0.3;
  const treadCount = 3;
  for (let row = 0; row < rearRows; row++) {
    const tierFront = oldRear - row * rowPitch;
    const tierBack = row === rearRows - 1 ? newRear : tierFront - rowPitch;
    const lowerY = tierY + row * rowRise;
    const upperY = lowerY + rowRise;

    horizontal('SCREENX rear seating platform', tierBack, tierFront,
      platformLeft, platformRight, upperY, tier.material, unitUv);
    riser('SCREENX rear platform fascia', tierFront, lowerY, upperY, platformLeft, platformRight);

    for (const [z0, z1] of [[left, platformLeft], [platformRight, right]]) {
      const innerZ = z0 === left ? z1 : z0;
      for (let step = 0; step < treadCount; step++) {
        const frontX = tierFront - step * stairDepth;
        const lastTread = step === treadCount - 1;
        const backX = lastTread ? tierBack : frontX - stairDepth;
        const y = lastTread ? upperY : lowerY + (step + 1) * rowRise / treadCount;
        horizontal('SCREENX rear aisle tread', backX, frontX, z0, z1, y, tier.material, unitUv);
        riser('SCREENX rear aisle riser', frontX, y - rowRise / treadCount, y, z0, z1);
        if (!lastTread) {
          quad('SCREENX stair side trim', [
            [backX, y, innerZ], [frontX, y, innerZ],
            [frontX, upperY, innerZ], [backX, upperY, innerZ],
          ], riserMaterial, [[0, 0], [1, 0], [1, 1], [0, 1]]);
        }
      }
    }
  }

  const ceiling = new MeshBasicMaterial({ color: 0x160c14, side: DoubleSide });
  horizontal('SCREENX ceiling', newRear, newFront, left, right, shell.max.y, ceiling, unitUv);

  model.updateMatrixWorld(true);
  return { screen, walls, rearX: newRear + 0.08 };
}
