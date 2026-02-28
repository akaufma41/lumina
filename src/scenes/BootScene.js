import Phaser from 'phaser';
import { TILE_SIZE, COLORS } from '../config/constants.js';

const T = TILE_SIZE;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Princess character spritesheets (Tori base + crown added in create())
    this.load.spritesheet('char_walk', '/assets/character/princess_walk.png', {
      frameWidth: 32, frameHeight: 32
    });
    this.load.spritesheet('char_idle', '/assets/character/princess_idle.png', {
      frameWidth: 32, frameHeight: 32
    });

    // Deep Forest tilesets (16x16 tiles)
    this.load.image('ts_grass', '/assets/tileset/grass.png');
    this.load.image('ts_water', '/assets/tileset/water.png');

    // Object images (converted to spritesheets in create() to ensure frames work)
    this.load.image('obj_trees', '/assets/objects/trees.png');
    this.load.image('obj_mushrooms', '/assets/objects/mushrooms.png');
    this.load.image('obj_bushes', '/assets/objects/bushes.png');
    this.load.image('obj_fountain', '/assets/objects/fountain.png');
    this.load.image('obj_lamp', '/assets/objects/lamp.png');

    // NPC character spritesheets (32x32, same format as player)
    const npcIds = ['keeper', 'moth', 'ember', 'fern', 'drift'];
    for (const id of npcIds) {
      this.load.spritesheet(`npc_${id}_idle`, `/assets/npc/${id}_idle.png`, {
        frameWidth: 32, frameHeight: 32
      });
      this.load.spritesheet(`npc_${id}_walk`, `/assets/npc/${id}_walk.png`, {
        frameWidth: 32, frameHeight: 32
      });
    }
  }

  create() {
    this.addPrincessCrown();
    this.convertObjectSpritesheets();
    this.generateTileTextures();
    this.composeTileset();

    // Wait for Crimson Text font to load before starting the game
    document.fonts.ready.then(() => {
      this.scene.start('ForestScene');
    });
  }

  // ─── OBJECT SPRITESHEETS ──────────────────────────────────────
  // Convert loaded images into proper spritesheets with frame data

  convertObjectSpritesheets() {
    const sheets = [
      { key: 'obj_trees',     fw: 32, fh: 48 },
      { key: 'obj_mushrooms', fw: 32, fh: 48 },
      { key: 'obj_bushes',    fw: 48, fh: 48 },
      { key: 'obj_fountain',  fw: 48, fh: 64 },
      { key: 'obj_lamp',      fw: 16, fh: 16 },
    ];

    for (const { key, fw, fh } of sheets) {
      const src = this.textures.get(key).getSourceImage();
      const canvas = document.createElement('canvas');
      canvas.width = src.width;
      canvas.height = src.height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0);
      this.textures.remove(key);
      this.textures.addSpriteSheet(key, canvas, {
        frameWidth: fw,
        frameHeight: fh
      });
    }
  }

  // ─── PRINCESS CROWN ─────────────────────────────────────────
  // Draw a small pixel crown on each frame of the character spritesheets

  addPrincessCrown() {
    // Crown pixel art: 7 wide × 4 tall
    // Row 0: .#...#.  (outer points)
    // Row 1: .##.##.  (inner points)
    // Row 2: .#####.  (band)
    // Row 3: ..###..  (base)
    const gold = '#FFD700';
    const darkGold = '#DAA520';
    const crownPattern = [
      // [dx, dy, color]
      [1, 0, gold], [5, 0, gold],                           // outer points
      [1, 1, gold], [2, 1, gold], [4, 1, gold], [5, 1, gold], [3, 1, darkGold], // inner points + center gem
      [1, 2, darkGold], [2, 2, gold], [3, 2, gold], [4, 2, gold], [5, 2, darkGold], // band
      [2, 3, darkGold], [3, 3, darkGold], [4, 3, darkGold], // base
    ];

    // Per-frame crown offsets — Y tracks Tori's head bob in each animation frame
    const crownPos = {
      idle: {
        cols: 4, rows: 3,
        offsets: [
          // row 0: facing down  (head Y per frame)
          { x: 12, yPerFrame: [7, 8, 8, 8] },
          // row 1: facing right
          { x: 13, yPerFrame: [7, 9, 9, 9] },
          // row 2: facing up
          { x: 12, yPerFrame: [7, 8, 8, 8] },
        ]
      },
      walk: {
        cols: 6, rows: 3,
        offsets: [
          // row 0: facing down
          { x: 12, yPerFrame: [8, 8, 7, 8, 8, 7] },
          // row 1: facing right
          { x: 13, yPerFrame: [9, 9, 8, 9, 9, 8] },
          // row 2: facing up
          { x: 12, yPerFrame: [8, 8, 7, 8, 8, 7] },
        ]
      }
    };

    this._stampCrown('char_idle', crownPos.idle, crownPattern);
    this._stampCrown('char_walk', crownPos.walk, crownPattern);
  }

  _stampCrown(textureKey, config, crownPattern) {
    const src = this.textures.get(textureKey).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw original sprite sheet
    ctx.drawImage(src, 0, 0);

    // Stamp crown on each frame, using per-frame Y offset to follow head bob
    for (let row = 0; row < config.rows; row++) {
      const offset = config.offsets[row];
      for (let col = 0; col < config.cols; col++) {
        const frameX = col * T;
        const frameY = row * T;
        const cy = offset.yPerFrame[col];
        for (const [dx, dy, color] of crownPattern) {
          ctx.fillStyle = color;
          ctx.fillRect(frameX + offset.x + dx, frameY + cy + dy, 1, 1);
        }
      }
    }

    // Replace the texture
    this.textures.remove(textureKey);
    this.textures.addSpriteSheet(textureKey, canvas, {
      frameWidth: T,
      frameHeight: T
    });
  }

  // Extract a 16x16 tile from a tileset image and upscale to 32x32
  extractTile(textureKey, col, row) {
    const src = this.textures.get(textureKey).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = T;
    canvas.height = T;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, col * 16, row * 16, 16, 16, 0, 0, T, T);
    return canvas;
  }

  // ─── TILE TEXTURES ───────────────────────────────────────────

  generateTileTextures() {
    // The Deep Forest grass tileset has autotile format.
    // We pick specific center-fill tiles for our simple tile ID system.
    // Grass tileset layout: rows of autotile groups, 12 cols × 20 rows
    // Center grass fill is around col 9, row 2 area (similar to spring tileset)

    // Tile 0: Dark forest grass
    {
      const canvas = this.extractTile('ts_grass', 9, 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0, 10, 5, 0.25)';
      ctx.fillRect(0, 0, T, T);
      this.textures.addCanvas('tile_0', canvas);
    }

    // Tile 1: Lighter grass with subtle flowers
    {
      const canvas = this.extractTile('ts_grass', 9, 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(20, 40, 10, 0.08)';
      ctx.fillRect(0, 0, T, T);
      // Small flowers
      ctx.fillStyle = '#bbbbaa';
      ctx.fillRect(7, 9, 2, 2);
      ctx.fillRect(21, 15, 2, 2);
      ctx.fillRect(14, 27, 2, 2);
      this.textures.addCanvas('tile_1', canvas);
    }

    // Tile 2: Dirt path (procedural — earthy brown)
    {
      const canvas = document.createElement('canvas');
      canvas.width = T;
      canvas.height = T;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      // Base dirt color
      ctx.fillStyle = '#7a6548';
      ctx.fillRect(0, 0, T, T);
      // Subtle variation patches
      ctx.fillStyle = 'rgba(90, 75, 50, 0.4)';
      ctx.fillRect(3, 5, 8, 6);
      ctx.fillRect(18, 14, 10, 7);
      ctx.fillRect(8, 22, 12, 5);
      ctx.fillStyle = 'rgba(140, 115, 80, 0.3)';
      ctx.fillRect(14, 2, 9, 5);
      ctx.fillRect(2, 16, 7, 8);
      ctx.fillRect(22, 24, 8, 6);
      // Tiny pebbles
      ctx.fillStyle = 'rgba(60, 50, 35, 0.5)';
      ctx.fillRect(6, 8, 2, 2);
      ctx.fillRect(20, 4, 2, 1);
      ctx.fillRect(25, 18, 2, 2);
      ctx.fillRect(10, 26, 1, 2);
      ctx.fillRect(28, 28, 2, 1);
      this.textures.addCanvas('tile_2', canvas);
    }

    // Tile 3: Tree placeholder (dark fill — actual trees placed as sprites)
    {
      const canvas = this.extractTile('ts_grass', 9, 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0, 15, 5, 0.5)';
      ctx.fillRect(0, 0, T, T);
      this.textures.addCanvas('tile_3', canvas);
    }

    // Tile 4: Deep water
    {
      const canvas = this.extractTile('ts_water', 9, 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0, 10, 30, 0.2)';
      ctx.fillRect(0, 0, T, T);
      this.textures.addCanvas('tile_4', canvas);
    }

    // Tile 5: Mushroom ground (tinted grass)
    {
      const canvas = this.extractTile('ts_grass', 9, 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(20, 0, 20, 0.15)';
      ctx.fillRect(0, 0, T, T);
      this.textures.addCanvas('tile_5', canvas);
    }

    // Tile 6: Lantern ground (warm-tinted grass)
    {
      const canvas = this.extractTile('ts_grass', 9, 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(30, 20, 0, 0.12)';
      ctx.fillRect(0, 0, T, T);
      this.textures.addCanvas('tile_6', canvas);
    }

    // Tile 7: Clearing (bright grass)
    {
      const canvas = this.extractTile('ts_grass', 9, 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(30, 50, 15, 0.06)';
      ctx.fillRect(0, 0, T, T);
      // Pebbles
      ctx.fillStyle = 'rgba(80, 80, 100, 0.2)';
      ctx.fillRect(7, 10, 3, 2);
      ctx.fillRect(22, 6, 2, 3);
      this.textures.addCanvas('tile_7', canvas);
    }

    // Tile 8: Water edge
    {
      const canvas = this.extractTile('ts_water', 9, 2);
      const ctx = canvas.getContext('2d');
      // Lighter shoreline tint
      ctx.fillStyle = 'rgba(50, 120, 100, 0.2)';
      ctx.fillRect(0, 0, T, T);
      this.textures.addCanvas('tile_8', canvas);
    }
  }

  // ─── COMPOSE TILESET STRIP ───────────────────────────────────

  composeTileset() {
    const tileCount = 9;
    const canvas = document.createElement('canvas');
    canvas.width = tileCount * T;
    canvas.height = T;
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < tileCount; i++) {
      const src = this.textures.get(`tile_${i}`).getSourceImage();
      ctx.drawImage(src, i * T, 0);
    }

    this.textures.addSpriteSheet('forest_tileset', canvas, {
      frameWidth: T,
      frameHeight: T
    });
  }
}
