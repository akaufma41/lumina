const FONT = '"Crimson Text", Georgia, "Times New Roman", serif';

export class CollectibleCounter {
  constructor(scene) {
    this.scene = scene;

    this.container = scene.add.container(0, 0);
    this.container.setDepth(180);
    this.container.setVisible(false);
    this.container.setScrollFactor(0);

    // Small orb icon
    this.icon = scene.add.text(24, 36, '\u2B50', {
      fontSize: '14px',
      resolution: 2,
    }).setOrigin(0.5);
    this.container.add(this.icon);

    // Count text  e.g. "3/10"
    this.text = scene.add.text(44, 36, '0/10', {
      fontSize: '16px',
      fontFamily: FONT,
      color: '#ffcc88',
      resolution: 2,
    }).setOrigin(0, 0.5);
    this.container.add(this.text);
  }

  update(collected, total) {
    this.text.setText(`${collected}/${total}`);

    // Only show after first orb is collected
    if (collected > 0 && !this.container.visible) {
      this.container.setVisible(true);
      this.container.setAlpha(0);
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        duration: 600,
        ease: 'Sine.easeOut',
      });
    }
  }

  /** Flash the counter when an orb is collected */
  flash() {
    this.scene.tweens.add({
      targets: this.text,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }
}
