import { NPC_SPAWNS } from '../map/forestMap.js';

const FONT = '"Crimson Text", Georgia, "Times New Roman", serif';

// Unicode arrows for 8 compass directions
const ARROWS = {
  N:  '\u2191', NE: '\u2197', E:  '\u2192', SE: '\u2198',
  S:  '\u2193', SW: '\u2199', W:  '\u2190', NW: '\u2196',
};

function getDirection(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY; // positive = south in tile coords
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  if (angle >= -22.5  && angle < 22.5)   return 'E';
  if (angle >= 22.5   && angle < 67.5)   return 'SE';
  if (angle >= 67.5   && angle < 112.5)  return 'S';
  if (angle >= 112.5  && angle < 157.5)  return 'SW';
  if (angle >= 157.5  || angle < -157.5) return 'W';
  if (angle >= -157.5 && angle < -112.5) return 'NW';
  if (angle >= -112.5 && angle < -67.5)  return 'N';
  if (angle >= -67.5  && angle < -22.5)  return 'NE';
  return 'N';
}

export class QuestArrow {
  constructor(scene) {
    this.scene = scene;

    this.container = scene.add.container(180, 200);
    this.container.setDepth(195);
    this.container.setVisible(false);
    this.container.setScrollFactor(0);

    // Large directional arrow
    this.arrow = scene.add.text(0, 0, '', {
      fontSize: '48px',
      fontFamily: FONT,
      color: '#ffcc88',
      stroke: '#000000',
      strokeThickness: 5,
      resolution: 2,
    }).setOrigin(0.5);
    this.container.add(this.arrow);

    // NPC name below arrow
    this.nameText = scene.add.text(0, 42, '', {
      fontSize: '24px',
      fontFamily: FONT,
      color: '#ffcc88',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(0.5);
    this.container.add(this.nameText);
  }

  show(targetNpcId, playerTileX, playerTileY) {
    const spawn = NPC_SPAWNS.find(s => s.id === targetNpcId);
    if (!spawn) return;

    const dir = getDirection(playerTileX, playerTileY, spawn.x, spawn.y);
    this.arrow.setText(ARROWS[dir] || ARROWS.N);
    this.nameText.setText(spawn.name);

    this.container.setVisible(true);
    this.container.setAlpha(0);

    this.scene.tweens.killTweensOf(this.container);

    // Fade in
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 400,
      ease: 'Sine.easeOut',
    });

    // Gentle pulse on the arrow
    this.scene.tweens.add({
      targets: this.arrow,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 600,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    });

    // Auto-fade after 4 seconds
    this.fadeTimer = this.scene.time.delayedCall(4000, () => {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 800,
        ease: 'Sine.easeIn',
        onComplete: () => this.container.setVisible(false),
      });
    });
  }

  hide() {
    if (this.fadeTimer) this.fadeTimer.remove(false);
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.arrow);
    this.container.setVisible(false);
    this.container.setAlpha(0);
  }
}
