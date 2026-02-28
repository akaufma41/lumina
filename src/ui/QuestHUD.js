export class QuestHUD {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(180);
    this.container.setVisible(false);
    this.container.setScrollFactor(0);

    // Background pill (drawn dynamically based on text width)
    this.bg = scene.add.graphics();
    this.container.add(this.bg);

    // Sparkle icon
    this.icon = scene.add.text(0, 18, '\u2726', {
      fontSize: '14px',
      fontFamily: '"Crimson Text", Georgia, serif',
      color: '#ffaa44',
      resolution: 2,
    }).setOrigin(0.5);
    this.container.add(this.icon);

    // Quest objective text
    this.text = scene.add.text(180, 18, '', {
      fontSize: '18px',
      fontFamily: '"Crimson Text", Georgia, serif',
      color: '#ffcc88',
      resolution: 2,
    }).setOrigin(0.5);
    this.container.add(this.text);
  }

  show(objectiveText) {
    this.text.setText(objectiveText);

    // Calculate pill dimensions based on text
    const textWidth = this.text.width;
    const pillW = textWidth + 50;
    const pillX = 180 - pillW / 2;

    this.icon.setPosition(pillX + 14, 18);

    this.bg.clear();
    this.bg.fillStyle(0x1a1a2e, 0.85);
    this.bg.fillRoundedRect(pillX, 4, pillW, 28, 14);
    this.bg.lineStyle(1.5, 0x4a3a6a, 0.6);
    this.bg.strokeRoundedRect(pillX, 4, pillW, 28, 14);

    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 500,
      ease: 'Sine.easeOut',
    });
  }

  hide() {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => this.container.setVisible(false),
    });
  }

  isVisible() {
    return this.container.visible && this.container.alpha > 0;
  }
}
