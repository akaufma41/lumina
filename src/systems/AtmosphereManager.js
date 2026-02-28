import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS } from '../config/constants.js';
import { FOREST_MAP } from '../map/forestMap.js';

// Tier data: [fireflyFrequency, lanternAlpha, mushroomAlpha, groundTint]
const TIERS = [
  { fireflyFreq: 300, lanternAlpha: 0.10, mushroomAlpha: 0.08, tint: null },
  { fireflyFreq: 200, lanternAlpha: 0.15, mushroomAlpha: 0.12, tint: 0x332211 },
  { fireflyFreq: 130, lanternAlpha: 0.22, mushroomAlpha: 0.18, tint: 0x443322 },
  { fireflyFreq: 80,  lanternAlpha: 0.30, mushroomAlpha: 0.25, tint: 0x554433 },
  { fireflyFreq: 40,  lanternAlpha: 0.40, mushroomAlpha: 0.35, tint: 0x665544 },
];

export class AtmosphereManager {
  constructor(scene) {
    this.scene = scene;
    this.currentTier = 0;
    this.lanternGlows = [];
    this.mushroomGlows = [];
    this.fireflyEmitter = null;
    this.groundTintOverlay = null;

    this.createFireflyTexture();
    this.createFireflies();
    this.createLanternGlows();
    this.createMushroomGlows();
    this.createGroundTint();
  }

  createFireflyTexture() {
    const g = this.scene.make.graphics({ add: false });
    g.fillStyle(0xffffaa, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture('firefly', 6, 6);
    g.destroy();
  }

  createFireflies() {
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;

    this.fireflyEmitter = this.scene.add.particles(0, 0, 'firefly', {
      x: { min: 0, max: worldW },
      y: { min: 0, max: worldH },
      lifespan: 5000,
      speed: { min: 4, max: 15 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      frequency: 300,
      blendMode: 'ADD',
      quantity: 1
    });
    this.fireflyEmitter.setDepth(50);
  }

  createLanternGlows() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (FOREST_MAP[y][x] === 6) {
          const px = x * TILE_SIZE + TILE_SIZE / 2;
          const py = y * TILE_SIZE + TILE_SIZE / 2;

          const glow = this.scene.add.circle(px, py - 4, 36, COLORS.LANTERN_GLOW, 0.1);
          glow.setDepth(8);

          this.scene.tweens.add({
            targets: glow,
            alpha: 0.05,
            scaleX: 0.85,
            scaleY: 0.85,
            duration: 2000 + Math.random() * 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });

          this.lanternGlows.push(glow);
        }
      }
    }
  }

  createMushroomGlows() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (FOREST_MAP[y][x] === 5) {
          const px = x * TILE_SIZE + TILE_SIZE / 2;
          const py = y * TILE_SIZE + TILE_SIZE / 2;

          const glow = this.scene.add.circle(px, py, 26, COLORS.MUSHROOM_GLOW, 0.08);
          glow.setDepth(8);

          this.scene.tweens.add({
            targets: glow,
            alpha: 0.03,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 2500 + Math.random() * 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });

          this.mushroomGlows.push(glow);
        }
      }
    }
  }

  createGroundTint() {
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;
    this.groundTintOverlay = this.scene.add.rectangle(
      worldW / 2, worldH / 2, worldW, worldH, 0x000000, 0
    );
    this.groundTintOverlay.setDepth(3);
  }

  applyTier(tier, animate = true) {
    const data = TIERS[tier];
    if (!data) return;
    this.currentTier = tier;
    const duration = animate ? 2000 : 0;

    // Fireflies — adjust frequency (lower = more frequent = more fireflies)
    if (this.fireflyEmitter) {
      this.fireflyEmitter.frequency = data.fireflyFreq;
    }

    // Lantern glows — tween base alpha up
    for (const glow of this.lanternGlows) {
      // Stop existing tween, apply new one with higher alpha range
      this.scene.tweens.killTweensOf(glow);
      const baseAlpha = data.lanternAlpha;
      if (animate) {
        this.scene.tweens.add({
          targets: glow,
          alpha: baseAlpha,
          duration: duration,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.scene.tweens.add({
              targets: glow,
              alpha: baseAlpha * 0.5,
              scaleX: 0.85,
              scaleY: 0.85,
              duration: 2000 + Math.random() * 1000,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }
        });
      } else {
        glow.setAlpha(baseAlpha);
        this.scene.tweens.add({
          targets: glow,
          alpha: baseAlpha * 0.5,
          scaleX: 0.85,
          scaleY: 0.85,
          duration: 2000 + Math.random() * 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }

    // Mushroom glows
    for (const glow of this.mushroomGlows) {
      this.scene.tweens.killTweensOf(glow);
      const baseAlpha = data.mushroomAlpha;
      if (animate) {
        this.scene.tweens.add({
          targets: glow,
          alpha: baseAlpha,
          duration: duration,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.scene.tweens.add({
              targets: glow,
              alpha: baseAlpha * 0.4,
              scaleX: 0.8,
              scaleY: 0.8,
              duration: 2500 + Math.random() * 1500,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }
        });
      } else {
        glow.setAlpha(baseAlpha);
        this.scene.tweens.add({
          targets: glow,
          alpha: baseAlpha * 0.4,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 2500 + Math.random() * 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }

    // Ground tint overlay
    if (this.groundTintOverlay && data.tint) {
      this.groundTintOverlay.setFillStyle(data.tint, 1);
      if (animate) {
        this.scene.tweens.add({
          targets: this.groundTintOverlay,
          alpha: 0.08 + tier * 0.04,
          duration: duration,
          ease: 'Sine.easeInOut'
        });
      } else {
        this.groundTintOverlay.setAlpha(0.08 + tier * 0.04);
      }
    } else if (this.groundTintOverlay && !data.tint) {
      this.groundTintOverlay.setAlpha(0);
    }
  }

  celebrateTierUp() {
    const cam = this.scene.cameras.main;
    const cx = cam.worldView.centerX;
    const cy = cam.worldView.centerY;

    // Sparkle burst using the existing firefly texture
    const emitter = this.scene.add.particles(cx, cy, 'firefly', {
      speed: { min: 30, max: 80 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 1500,
      quantity: 20,
      emitting: false,
      blendMode: 'ADD',
    });
    emitter.setDepth(100);
    emitter.explode();

    // Clean up after particles fade
    this.scene.time.delayedCall(2000, () => emitter.destroy());
  }
}
