export const cinemas = [
  {
    id: 'cinema-2d',
    label: '2D 영화관',
    model: new URL('./2D cinema.optimized.glb', import.meta.url).href,
    defaultSeat: 'F08',
    adjacentSeats: { before: 'F06', after: 'F10' },
    screenTarget: [17.307, 9.879, 0.0355],
    // World coordinates in GLB units. Facing +X, screen-right is +Z.
    seats: [
      { id: 'F07', eye: [-8.95, 7.65, -1.9939] },
      { id: 'F08', eye: [-8.95, 7.65, -0.0623] },
      { id: 'F09', eye: [-8.95, 7.65, 1.8694] },
    ],
  },
];
