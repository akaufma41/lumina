import Phaser from 'phaser';
import { TILE_SIZE, COLORS } from '../config/constants.js';
import { NPC_SPAWNS } from '../map/forestMap.js';

const DISSOLVE_RANGE = 4; // tiles

export class QuestBeacon {
  constructor(scene) {
    this.scene = scene;
    this.light = null;
    this.targetTileX = 0;
    this.targetTileY = 0;
    this.elapsed = 0;
  }

  show(targetNpcId) {
    // Clean up any existing beacon
    this.destroy();

    const spawn = NPC_SPAWNS.find(s => s.id === targetNpcId);
    if (!spawn) return;

    this.targetTileX = spawn.x;
    this.targetTileY = spawn.y;

    const color = COLORS[spawn.colorKey] || 0xffcc88;
    const px = spawn.x * TILE_SIZE + TILE_SIZE / 2;
    const py = spawn.y * TILE_SIZE - 8; // slightly above the NPC

    this.light = this.scene.add.sprite(px, py, 'firefly');
    this.light.setScale(4);
    this.light.setTint(color);
    this.light.setBlendMode(Phaser.BlendModes.ADD);
    this.light.setAlpha(0);
    this.light.setDepth(90);

    this.elapsed = 0;

    // Fade in
    this.scene.tweens.add({
      targets: this.light,
      alpha: 0.7,
      duration: 800,
      ease: 'Sine.easeOut',
    });

    // Scale pulse
    this.scene.tweens.add({
      targets: this.light,
      scaleX: 5,
      scaleY: 5,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  update(playerTileX, playerTileY) {
    if (!this.light) return;

    // Sine-wave bob
    this.elapsed += 0.04;
    const baseY = this.targetTileY * TILE_SIZE - 8;
    this.light.y = baseY + Math.sin(this.elapsed) * 6;

    // Auto-dissolve when player is close
    const dx = playerTileX - this.targetTileX;
    const dy = playerTileY - this.targetTileY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DISSOLVE_RANGE) {
      this.dissolve();
    }
  }

  dissolve() {
    if (!this.light) return;

    const light = this.light;
    this.light = null;

    // Sparkle burst
    const emitter = this.scene.add.particles(light.x, light.y, 'firefly', {
      speed: { min: 30, max: 80 },
      scale: { start: 2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: light.tintTopLeft,
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 800,
      quantity: 12,
      emitting: false,
    });
    emitter.setDepth(90);
    emitter.explode(12);

    this.scene.tweens.killTweensOf(light);
    this.scene.tweens.add({
      targets: light,
      alpha: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Sine.easeIn',
      onComplete: () => {
        light.destroy();
        this.scene.time.delayedCall(1000, () => emitter.destroy());
      },
    });
  }

  destroy() {
    if (this.light) {
      this.scene.tweens.killTweensOf(this.light);
      this.light.destroy();
      this.light = null;
    }
  }
}
