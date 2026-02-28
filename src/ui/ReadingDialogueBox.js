export class ReadingDialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.words = [];          // { textObj, word, isCurriculum }
    this.revealIndex = 0;
    this.revealTimer = null;
    this.revealComplete = false;
    this.curriculumWordsInText = [];
    this.parentCallback = null;
    this.isVisible = false;

    // Layout constants
    this.BOX_X = 10;
    this.BOX_Y = 440;
    this.BOX_W = 340;
    this.BOX_H = 200;
    this.PAD_LEFT = 25;
    this.PAD_TOP = 48;
    this.LINE_HEIGHT = 34;
    this.MAX_TEXT_W = 300;
    this.WORD_GAP = 8;
    this.REVEAL_DELAY = 400;

    const FONT = '"Crimson Text", Georgia, "Times New Roman", serif';

    // --- Container ---
    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);
    this.container.setVisible(false);

    // --- Box background ---
    this.boxGfx = scene.add.graphics();
    this._drawBox();
    this.container.add(this.boxGfx);

    // --- Name tab ---
    this.nameGfx = scene.add.graphics();
    this.container.add(this.nameGfx);

    this.nameText = scene.add.text(this.BOX_X + 20, this.BOX_Y - 12, '', {
      fontSize: '16px',
      fontFamily: FONT,
      fontStyle: 'bold',
      color: '#ffcc88',
      resolution: 2,
    });
    this.container.add(this.nameText);

    // --- Word container (holds individual word text objects) ---
    this.wordContainer = scene.add.container(0, 0);
    this.container.add(this.wordContainer);

    // --- Advance indicator ---
    this.advanceIndicator = scene.add.text(
      this.BOX_X + this.BOX_W - 20,
      this.BOX_Y + this.BOX_H - 18,
      '\u25B8', // right arrow
      { fontSize: '18px', fontFamily: FONT, color: '#ffaa44', resolution: 2 }
    ).setOrigin(0.5);
    this.advanceIndicator.setVisible(false);
    this.container.add(this.advanceIndicator);

    scene.tweens.add({
      targets: this.advanceIndicator,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- Parent star button ---
    this.starContainer = scene.add.container(
      this.BOX_X + this.BOX_W - 22,
      this.BOX_Y + 18
    );
    this.starContainer.setDepth(201);
    this.starContainer.setVisible(false);

    this.starBg = scene.add.graphics();
    this.starBg.fillStyle(0x2a2a3a, 0.85);
    this.starBg.fillCircle(0, 0, 16);
    this.starBg.lineStyle(1.5, 0x6a5a8a, 0.8);
    this.starBg.strokeCircle(0, 0, 16);
    this.starContainer.add(this.starBg);

    this.starText = scene.add.text(0, 0, '\u2726', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#8877aa',
    }).setOrigin(0.5);
    this.starContainer.add(this.starText);

    // Make star interactive
    this.starHitArea = scene.add.circle(0, 0, 18, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.starContainer.add(this.starHitArea);

    this.starHitArea.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      this._onStarTap();
    });

    this.container.add(this.starContainer);
  }

  _drawBox() {
    const { BOX_X, BOX_Y, BOX_W, BOX_H } = this;
    this.boxGfx.clear();
    // Main fill
    this.boxGfx.fillStyle(0x1a1a2e, 0.95);
    this.boxGfx.fillRoundedRect(BOX_X, BOX_Y, BOX_W, BOX_H, 10);
    // Outer border
    this.boxGfx.lineStyle(2, 0x4a3a6a, 1);
    this.boxGfx.strokeRoundedRect(BOX_X, BOX_Y, BOX_W, BOX_H, 10);
    // Inner glow border
    this.boxGfx.lineStyle(1, 0x6a5a8a, 0.25);
    this.boxGfx.strokeRoundedRect(BOX_X + 2, BOX_Y + 2, BOX_W - 4, BOX_H - 4, 9);
  }

  show(name, text, curriculumWords = []) {
    // Clean up previous words
    this._clearWords();

    // Draw name tab
    this.nameGfx.clear();
    const nameWidth = Math.max(name.length * 11 + 24, 60);
    this.nameGfx.fillStyle(0x2a1a3a, 0.95);
    this.nameGfx.fillRoundedRect(this.BOX_X + 10, this.BOX_Y - 16, nameWidth, 28, 6);
    this.nameGfx.lineStyle(2, 0xaa88cc, 0.8);
    this.nameGfx.strokeRoundedRect(this.BOX_X + 10, this.BOX_Y - 16, nameWidth, 28, 6);
    this.nameText.setText(name);

    // Store curriculum words for this text
    this.curriculumWordsInText = curriculumWords;
    const currSet = new Set(curriculumWords.map(w => w.toLowerCase()));

    // Split text into words and position them
    const rawWords = text.split(/\s+/).filter(w => w.length > 0);
    const FONT = '"Crimson Text", Georgia, "Times New Roman", serif';

    let cursorX = this.BOX_X + this.PAD_LEFT;
    let cursorY = this.BOX_Y + this.PAD_TOP;
    const startX = cursorX;

    for (const word of rawWords) {
      const stripped = word.toLowerCase().replace(/[^a-z]/g, '');
      const isCurriculum = currSet.has(stripped);

      const textObj = this.scene.add.text(cursorX, cursorY, word, {
        fontSize: '24px',
        fontFamily: FONT,
        color: isCurriculum ? '#ffeebb' : '#eeddff',
        resolution: 2,
      });
      textObj.setAlpha(0);

      const wordWidth = textObj.width;

      // Wrap to next line if needed
      if (cursorX + wordWidth > startX + this.MAX_TEXT_W && cursorX > startX) {
        cursorX = startX;
        cursorY += this.LINE_HEIGHT;
        textObj.setPosition(cursorX, cursorY);
      }

      this.wordContainer.add(textObj);
      this.words.push({ textObj, word, isCurriculum });

      cursorX += wordWidth + this.WORD_GAP;
    }

    // Reset reveal state
    this.revealIndex = 0;
    this.revealComplete = false;
    this.advanceIndicator.setVisible(false);
    this.starContainer.setVisible(false);

    // Start word-by-word reveal
    if (this.revealTimer) this.revealTimer.remove();

    if (this.words.length > 0) {
      // Reveal first word immediately
      this._revealWord(0);
      this.revealIndex = 1;

      if (this.words.length > 1) {
        this.revealTimer = this.scene.time.addEvent({
          delay: this.REVEAL_DELAY,
          repeat: this.words.length - 2,
          callback: () => {
            if (this.revealIndex < this.words.length) {
              this._revealWord(this.revealIndex);
              this.revealIndex++;
              if (this.revealIndex >= this.words.length) {
                this._onRevealComplete();
              }
            }
          },
        });
      } else {
        this._onRevealComplete();
      }
    }

    this.container.setVisible(true);
    this.isVisible = true;
  }

  _revealWord(index) {
    const entry = this.words[index];
    if (!entry) return;

    // Fade in the word
    this.scene.tweens.add({
      targets: entry.textObj,
      alpha: 1,
      duration: 250,
      ease: 'Sine.easeOut',
    });

    // Add curriculum glow effect
    if (entry.isCurriculum) {
      // Subtle gold underline
      const bounds = entry.textObj.getBounds();
      const underline = this.scene.add.graphics();
      underline.fillStyle(0xffeebb, 0.4);
      underline.fillRect(
        entry.textObj.x,
        entry.textObj.y + entry.textObj.height - 2,
        entry.textObj.width,
        2
      );
      this.wordContainer.add(underline);

      // Pulsing glow on the word
      this.scene.tweens.add({
        targets: entry.textObj,
        alpha: { from: 1, to: 0.7 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 300,
      });
    }
  }

  _onRevealComplete() {
    this.revealComplete = true;
    this.advanceIndicator.setVisible(true);

    // Show parent star button if there are curriculum words
    if (this.curriculumWordsInText.length > 0) {
      this.starContainer.setVisible(true);
    }
  }

  _onStarTap() {
    // Flash gold
    this.starText.setColor('#ffcc44');
    this.scene.time.delayedCall(300, () => {
      this.starText.setColor('#8877aa');
    });

    // Fire callback
    if (this.parentCallback) {
      this.parentCallback(this.curriculumWordsInText);
    }
  }

  completeReveal() {
    if (this.revealTimer) this.revealTimer.remove();

    for (let i = this.revealIndex; i < this.words.length; i++) {
      const entry = this.words[i];
      entry.textObj.setAlpha(1);

      if (entry.isCurriculum) {
        // Add underline
        const underline = this.scene.add.graphics();
        underline.fillStyle(0xffeebb, 0.4);
        underline.fillRect(
          entry.textObj.x,
          entry.textObj.y + entry.textObj.height - 2,
          entry.textObj.width,
          2
        );
        this.wordContainer.add(underline);

        // Pulsing glow
        this.scene.tweens.add({
          targets: entry.textObj,
          alpha: { from: 1, to: 0.7 },
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    this.revealIndex = this.words.length;
    this._onRevealComplete();
  }

  isRevealing() {
    return !this.revealComplete && this.isVisible;
  }

  hide() {
    if (this.revealTimer) this.revealTimer.remove();
    this._clearWords();
    this.revealComplete = false;
    this.isVisible = false;
    this.container.setVisible(false);
    this.starContainer.setVisible(false);
  }

  _clearWords() {
    // Destroy all word text objects and graphics in the word container
    this.wordContainer.removeAll(true);
    this.words = [];
    this.revealIndex = 0;
  }

  onParentConfirm(cb) {
    this.parentCallback = cb;
  }
}
