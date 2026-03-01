import Phaser from 'phaser';
import { TILE_SIZE, COLORS } from '../config/constants.js';
import { NPC_SPAWNS } from '../map/forestMap.js';

const LEAD_DISTANCE = 5;  // tiles ahead of player toward target
const DISSOLVE_RANGE = 4; // dissolve when player is this close to target

export class QuestGuide {
  constructor(scene) {
    this.scene = scene;
    this.light = null;
    this.targetTileX = 0;
    this.targetTileY = 0;
    this.complete = false;
    this.elapsed = 0;
    this.baseX = 0;
    this.baseY = 0;
  }

  show(targetNpcId) {
    // Clean up any existing guide
    this.destroy();
    this.complete = false;
    this.elapsed = 0;

    const spawn = NPC_SPAWNS.find(s => s.id === targetNpcId);
    if (!spawn) return;

    this.targetTileX = spawn.x;
    this.targetTileY = spawn.y;

    const color = COLORS[spawn.colorKey] || 0xffcc88;
    const playerPos = this.scene.player.getTilePos();

    // Position the guide partway between the player and the target
    const dx = this.targetTileX - playerPos.x;
    const dy = this.targetTileY - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const lead = Math.min(LEAD_DISTANCE, dist * 0.5);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;

    this.baseX = (playerPos.x + nx * lead) * TILE_SIZE + TILE_SIZE / 2;
    this.baseY = (playerPos.y + ny * lead) * TILE_SIZE + TILE_SIZE / 2;

    this.light = this.scene.add.sprite(this.baseX, this.baseY, 'firefly');
    this.light.setScale(2.5);
    this.light.setTint(color);
    this.light.setBlendMode(Phaser.BlendModes.ADD);
    this.light.setAlpha(0);
    this.light.setDepth(100);

    // Fade in
    this.scene.tweens.add({
      targets: this.light,
      alpha: 0.85,
      duration: 800,
      ease: 'Sine.easeOut',
    });

    // Scale pulse
    this.scene.tweens.add({
      targets: this.light,
      scaleX: 3,
      scaleY: 3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  update(playerTileX, playerTileY) {
    if (!this.light || this.complete) return;

    // Direction from player toward target NPC
    const dx = this.targetTileX - playerTileX;
    const dy = this.targetTileY - playerTileY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Dissolve when player is close to target
    if (dist < DISSOLVE_RANGE) {
      this.dissolve();
      return;
    }

    // Position guide LEAD_DISTANCE tiles ahead of player in the target direction
    const lead = Math.min(LEAD_DISTANCE, dist * 0.5);
    const nx = dx / dist;
    const ny = dy / dist;

    const targetPx = (playerTileX + nx * lead) * TILE_SIZE + TILE_SIZE / 2;
    const targetPy = (playerTileY + ny * lead) * TILE_SIZE + TILE_SIZE / 2;

    // Smooth lerp
    this.baseX = Phaser.Math.Linear(this.baseX, targetPx, 0.05);
    this.baseY = Phaser.Math.Linear(this.baseY, targetPy, 0.05);

    // Sine bob
    this.elapsed += 0.03;
    const bob = Math.sin(this.elapsed) * 5;

    this.light.x = this.baseX;
    this.light.y = this.baseY + bob;
  }

  dissolve() {
    if (!this.light || this.complete) return;
    this.complete = true;

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
    emitter.setDepth(100);
    emitter.explode(12);

    this.scene.tweens.killTweensOf(light);
    this.scene.tweens.add({
      targets: light,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 600,
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
    this.complete = false;
  }
}
