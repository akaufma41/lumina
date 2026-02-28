export class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.typewriterActive = false;
    this.typewriterTimer = null;
    this.fullText = '';
    this.charIndex = 0;

    // Container holds all dialogue UI elements
    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);
    this.container.setVisible(false);

    // Name tab background
    this.nameGfx = scene.add.graphics();
    this.container.add(this.nameGfx);

    // Name text
    this.nameText = scene.add.text(30, 411, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffcc88',
      fontStyle: 'bold'
    });
    this.container.add(this.nameText);

    // Main box background
    this.boxGfx = scene.add.graphics();
    this.boxGfx.fillStyle(0x1a1a2e, 0.95);
    this.boxGfx.fillRoundedRect(20, 430, 320, 120, 8);
    this.boxGfx.lineStyle(2, 0x4a3a6a, 1);
    this.boxGfx.strokeRoundedRect(20, 430, 320, 120, 8);
    this.boxGfx.lineStyle(1, 0x6a5a8a, 0.3);
    this.boxGfx.strokeRoundedRect(22, 432, 316, 116, 7);
    this.container.add(this.boxGfx);

    // Dialogue text
    this.dialogueText = scene.add.text(35, 442, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#eeddff',
      wordWrap: { width: 290 },
      lineSpacing: 6
    });
    this.container.add(this.dialogueText);

    // Advance indicator (pulsing star)
    this.advanceIndicator = scene.add.text(325, 537, '\u2726', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffaa44'
    }).setOrigin(0.5);
    this.advanceIndicator.setVisible(false);
    this.container.add(this.advanceIndicator);

    scene.tweens.add({
      targets: this.advanceIndicator,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  show(name, text) {
    // Draw name tab sized to fit the name
    this.nameGfx.clear();
    const nameWidth = name.length * 10 + 20;
    this.nameGfx.fillStyle(0x2a1a3a, 0.95);
    this.nameGfx.fillRoundedRect(20, 408, nameWidth, 22, 6);
    this.nameGfx.lineStyle(2, 0xaa88cc, 0.8);
    this.nameGfx.strokeRoundedRect(20, 408, nameWidth, 22, 6);

    this.nameText.setText(name);

    // Start typewriter effect
    this.fullText = text;
    this.charIndex = 0;
    this.typewriterActive = true;
    this.dialogueText.setText('');
    this.advanceIndicator.setVisible(false);

    if (this.typewriterTimer) this.typewriterTimer.remove();

    this.typewriterTimer = this.scene.time.addEvent({
      delay: 40,
      repeat: text.length - 1,
      callback: () => {
        this.charIndex++;
        this.dialogueText.setText(this.fullText.substring(0, this.charIndex));
        if (this.charIndex >= this.fullText.length) {
          this.typewriterActive = false;
          this.advanceIndicator.setVisible(true);
        }
      }
    });

    this.container.setVisible(true);
  }

  completeTypewriter() {
    if (this.typewriterTimer) this.typewriterTimer.remove();
    this.dialogueText.setText(this.fullText);
    this.typewriterActive = false;
    this.charIndex = this.fullText.length;
    this.advanceIndicator.setVisible(true);
  }

  isTypewriting() {
    return this.typewriterActive;
  }

  hide() {
    if (this.typewriterTimer) this.typewriterTimer.remove();
    this.typewriterActive = false;
    this.container.setVisible(false);
  }
}
