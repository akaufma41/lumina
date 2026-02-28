// Hidden collectible orbs — 2 per NPC, color-coded to match
// Positions are tile coordinates on walkable tiles in each NPC's area

export const COLLECTIBLES = [
  // Keeper (teal) — center clearing
  { id: 'orb_k1', npcId: 'keeper', tileX: 13, tileY: 15, color: 0x88cccc },
  { id: 'orb_k2', npcId: 'keeper', tileX: 25, tileY: 21, color: 0x88cccc },

  // Moth (purple) — mushroom grove NW
  { id: 'orb_m1', npcId: 'moth', tileX: 4, tileY: 6, color: 0xbb88dd },
  { id: 'orb_m2', npcId: 'moth', tileX: 7, tileY: 9, color: 0xbb88dd },

  // Ember (orange) — lantern clearing NE
  { id: 'orb_e1', npcId: 'ember', tileX: 33, tileY: 5, color: 0xddaa66 },
  { id: 'orb_e2', npcId: 'ember', tileX: 29, tileY: 9, color: 0xddaa66 },

  // Fern (green) — garden SW
  { id: 'orb_f1', npcId: 'fern', tileX: 4, tileY: 30, color: 0x88cc88 },
  { id: 'orb_f2', npcId: 'fern', tileX: 8, tileY: 32, color: 0x88cc88 },

  // Drift (blue) — near the pond SE
  { id: 'orb_d1', npcId: 'drift', tileX: 25, tileY: 29, color: 0x88aadd },
  { id: 'orb_d2', npcId: 'drift', tileX: 33, tileY: 29, color: 0x88aadd },
];
