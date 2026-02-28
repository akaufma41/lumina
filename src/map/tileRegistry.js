// Tile type definitions
// id must match the values used in forestMap.js
export const TILES = {
  GRASS_DARK:  { id: 0, walkable: true },
  GRASS_LIGHT: { id: 1, walkable: true },
  PATH:        { id: 2, walkable: true },
  TREE:        { id: 3, walkable: false },
  WATER:       { id: 4, walkable: false },
  MUSHROOM:    { id: 5, walkable: true },
  LANTERN:     { id: 6, walkable: true },
  CLEARING:    { id: 7, walkable: true },
  WATER_EDGE:  { id: 8, walkable: false },
};

// Lookup: tile id -> walkable
export const WALKABLE = {};
for (const tile of Object.values(TILES)) {
  WALKABLE[tile.id] = tile.walkable;
}
