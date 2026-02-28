import { TILE_SIZE } from '../config/constants.js';
import { COLLECTIBLES } from '../config/collectibleData.js';

const STORAGE_KEY = 'lumina_collectibles';
const PROXIMITY_RADIUS = 3; // tiles — orb pulses when player is this close
const COLLECT_RADIUS = 1.5; // tiles — tap within this range to collect

export class CollectibleManager {
  constructor(scene) {
    this.scene = scene;
    this.orbs = [];        // { id, npcId, sprite, glow, collected }
    this.collected = this._loadState();

    this._createOrbTextures();
    this._spawnOrbs();
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.collected));
  }

  _createOrbTextures() {
    // Create a unique texture for each orb color
    const colors = new Set(COLLECTIBLES.map(c => c.color));
    for (const color of colors) {
      const key = `orb_${color.toString(16)}`;
      if (this.scene.textures.exists(key)) continue;

      const g = this.scene.make.graphics({ add: false });

      // Outer glow
      g.fillStyle(color, 0.15);
      g.fillCircle(16, 16, 14);

      // Mid glow
      g.fillStyle(color, 0.35);
      g.fillCircle(16, 16, 9);

      // Inner bright core
      g.fillStyle(color, 0.85);
      g.fillCircle(16, 16, 5);

      // White center highlight
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(15, 14, 2);

      g.generateTexture(key, 32, 32);
      g.destroy();
    }
  }

  _spawnOrbs() {
    for (const data of COLLECTIBLES) {
      if (this.collected[data.id]) continue; // already collected

      const px = data.tileX * TILE_SIZE + TILE_SIZE / 2;
      const py = data.tileY * TILE_SIZE + TILE_SIZE / 2;
      const texKey = `orb_${data.color.toString(16)}`;

      // Orb sprite
      const sprite = this.scene.add.image(px, py, texKey);
      sprite.setDepth(15);
      sprite.setAlpha(0.6);
      sprite.setScale(0.8);
      sprite.setInteractive({ useHandCursor: true });

      // Gentle float animation
      this.scene.tweens.add({
        targets: sprite,
        y: py - 4,
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Subtle pulse
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0.35,
        scaleX: 0.65,
        scaleY: 0.65,
        duration: 1800 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.orbs.push({
        id: data.id,
        npcId: data.npcId,
        tileX: data.tileX,
        tileY: data.tileY,
        color: data.color,
        sprite,
        collected: false,
      });
    }
  }

  /**
   * Check if a tap at the given tile coordinates is near an uncollected orb.
   * Returns the orb data if so, null otherwise.
   */
  checkTap(tileX, tileY) {
    for (const orb of this.orbs) {
      if (orb.collected) continue;
      const dx = tileX - orb.tileX;
      const dy = tileY - orb.tileY;
      if (Math.sqrt(dx * dx + dy * dy) <= COLLECT_RADIUS) {
        return orb;
      }
    }
    return null;
  }

  /**
   * Collect an orb — float-up + sparkle animation, persist to localStorage.
   * Returns { npcId, allForNpc } indicating whether both orbs for the NPC are now found.
   */
  collectOrb(orb) {
    if (orb.collected) return null;
    orb.collected = true;
    this.collected[orb.id] = true;
    this._saveState();

    const sprite = orb.sprite;

    // Kill existing tweens
    this.scene.tweens.killTweensOf(sprite);

    // Float-up + fade out
    this.scene.tweens.add({
      targets: sprite,
      y: sprite.y - 40,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => {
        sprite.destroy();
      },
    });

    // Sparkle burst
    const emitter = this.scene.add.particles(sprite.x, sprite.y, 'firefly', {
      speed: { min: 20, max: 60 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: orb.color,
      lifespan: 1000,
      quantity: 12,
      emitting: false,
      blendMode: 'ADD',
    });
    emitter.setDepth(100);
    emitter.explode();
    this.scene.time.delayedCall(1500, () => emitter.destroy());

    const allForNpc = this.allCollectedForNpc(orb.npcId);
    return { npcId: orb.npcId, allForNpc };
  }

  /**
   * Update orb visibility based on player proximity.
   * Orbs glow brighter when the player is nearby.
   */
  updateProximity(playerTileX, playerTileY) {
    for (const orb of this.orbs) {
      if (orb.collected) continue;

      const dx = playerTileX - orb.tileX;
      const dy = playerTileY - orb.tileY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= PROXIMITY_RADIUS) {
        // Brighten when close
        orb.sprite.setAlpha(Math.min(orb.sprite.alpha + 0.02, 0.9));
      }
    }
  }

  /** Count of collected orbs for a specific NPC */
  getCollectedForNpc(npcId) {
    return COLLECTIBLES.filter(c => c.npcId === npcId && this.collected[c.id]).length;
  }

  /** True if both orbs for this NPC have been found */
  allCollectedForNpc(npcId) {
    const npcOrbs = COLLECTIBLES.filter(c => c.npcId === npcId);
    return npcOrbs.every(c => this.collected[c.id]);
  }

  /** Total collected across all NPCs */
  getTotalCollected() {
    return Object.keys(this.collected).length;
  }

  /** Total possible */
  getTotal() {
    return COLLECTIBLES.length;
  }
}
