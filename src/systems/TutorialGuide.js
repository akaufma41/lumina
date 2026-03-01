import { TILE_SIZE } from '../config/constants.js';

const PATH_X = 19;       // central path column
const KEEPER_Y = 17;     // Keeper's tile row
const LEAD_DISTANCE = 4; // tiles ahead of player
const MIN_Y = 18;        // don't go past the Keeper

export class TutorialGuide {
  constructor(scene) {
    this.scene = scene;
    this.complete = false;
    this.tappedOnce = false;
    this.elapsed = 0;

    // Guide light — reuse the firefly texture, scaled up and gold-tinted
    const startTileY = scene.player.getTilePos().y - LEAD_DISTANCE;
    this.baseX = PATH_X * TILE_SIZE + TILE_SIZE / 2;
    this.baseY = startTileY * TILE_SIZE + TILE_SIZE / 2;

    this.light = scene.add.sprite(this.baseX, this.baseY, 'firefly');
    this.light.setScale(2.5);
    this.light.setTint(0xffcc88);
    this.light.setBlendMode(Phaser.BlendModes.ADD);
    this.light.setAlpha(0);
    this.light.setDepth(100);

    // Fade the light in
    scene.tweens.add({
      targets: this.light,
      alpha: 0.85,
      duration: 1200,
      ease: 'Sine.easeOut',
    });

    // Scale pulse only (no y tween — we handle y manually with sine bob)
    scene.tweens.add({
      targets: this.light,
      scaleX: 3,
      scaleY: 3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // After 2.5s of no input, show "Tap to walk!"
    this.promptTimer = scene.time.delayedCall(2500, () => {
      if (!this.tappedOnce && !this.complete) {
        const uiScene = scene.scene.get('UIScene');
        if (uiScene) uiScene.showTutorialPrompt('Tap to walk!');
      }
    });
  }

  onFirstTap() {
    if (this.tappedOnce) return;
    this.tappedOnce = true;

    // Cancel prompt timer if it hasn't fired yet
    if (this.promptTimer) this.promptTimer.remove(false);

    // Hide the prompt
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene) uiScene.hideTutorialPrompt();
  }

  update(playerTileX, playerTileY) {
    if (this.complete) return;

    // Target position: LEAD_DISTANCE tiles north of player, on the path
    const targetTileY = Math.max(playerTileY - LEAD_DISTANCE, MIN_Y);
    const targetPx = PATH_X * TILE_SIZE + TILE_SIZE / 2;
    const targetPy = targetTileY * TILE_SIZE + TILE_SIZE / 2;

    // Lerp base position toward target
    this.baseX = Phaser.Math.Linear(this.baseX, targetPx, 0.06);
    this.baseY = Phaser.Math.Linear(this.baseY, targetPy, 0.06);

    // Sine bob for gentle floating effect
    this.elapsed += 0.03;
    const bob = Math.sin(this.elapsed) * 5;

    this.light.x = this.baseX;
    this.light.y = this.baseY + bob;

    // Dissolve when player reaches Keeper proximity
    if (playerTileY <= KEEPER_Y + 2) {
      this.dissolve();
    }
  }

  dissolve() {
    if (this.complete) return;
    this.complete = true;

    // Stop any prompt
    if (this.promptTimer) this.promptTimer.remove(false);
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene) uiScene.hideTutorialPrompt();

    // Sparkle burst
    const emitter = this.scene.add.particles(this.light.x, this.light.y, 'firefly', {
      speed: { min: 30, max: 80 },
      scale: { start: 2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xffcc88,
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 800,
      quantity: 12,
      emitting: false,
    });
    emitter.setDepth(100);
    emitter.explode(12);

    // Fade out the guide light
    this.scene.tweens.killTweensOf(this.light);
    this.scene.tweens.add({
      targets: this.light,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 600,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.light.destroy();
        this.scene.time.delayedCall(1000, () => emitter.destroy());
      },
    });
  }
}
