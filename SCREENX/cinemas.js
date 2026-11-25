// Distances in model units, measured from the last two rows of the GLB.
export const rearSeating = { rows: 4, pitch: 2.7549, rise: 0.8339 };

const rearEyeX = -8.95 - rearSeating.rows * rearSeating.pitch;
const rearEyeY = 7.65 + rearSeating.rows * rearSeating.rise;

export const cinemas = [
  {
    id: 'screenx',
    label: 'SCREENX',
    model: new URL('../2D/2D cinema.optimized.glb', import.meta.url).href,
    defaultSeat: 'F08',
    adjacentSeats: { before: 'F06', after: 'F10' },
    screenTarget: [17.307, 9.879, 0.0355],
    // World coordinates in GLB units. Facing +X, screen-right is +Z.
    seats: [
      { id: 'F07', eye: [rearEyeX, rearEyeY, -1.9939] },
      { id: 'F08', eye: [rearEyeX, rearEyeY, -0.0623] },
      { id: 'F09', eye: [rearEyeX, rearEyeY, 1.8694] },
    ],
  },
];
