export class ConversationUI {
  constructor(scene) {
    this.scene = scene;
    this.onConfirm = null;
    this.onEdit = null;
    this.transcript = '';
    this.isListening = false;
    this.recognition = null;

    // Main container for all conversation UI
    this.container = scene.add.container(0, 0);
    this.container.setDepth(210);
    this.container.setVisible(false);

    // --- Child speech bubble (shows what child said) ---
    this.childBubbleGfx = scene.add.graphics();
    this.container.add(this.childBubbleGfx);

    this.childBubbleText = scene.add.text(180, 395, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ccddff',
      wordWrap: { width: 240 },
      align: 'center'
    }).setOrigin(0.5, 1);
    this.container.add(this.childBubbleText);

    // --- Parent confirm/edit buttons ---
    this.confirmBtnGfx = scene.add.graphics();
    this.container.add(this.confirmBtnGfx);

    this.confirmHit = scene.add.rectangle(260, 387, 44, 32);
    this.confirmHit.setInteractive().setAlpha(0.001);
    this.container.add(this.confirmHit);

    this.confirmText = scene.add.text(260, 387, '\u2713', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#44dd66',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(this.confirmText);

    this.editBtnGfx = scene.add.graphics();
    this.container.add(this.editBtnGfx);

    this.editHit = scene.add.rectangle(310, 387, 44, 32);
    this.editHit.setInteractive().setAlpha(0.001);
    this.container.add(this.editHit);

    this.editText = scene.add.text(310, 387, '\u270E', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffcc88'
    }).setOrigin(0.5);
    this.container.add(this.editText);

    // Button styling
    this.drawButton(this.confirmBtnGfx, 238, 371, 44, 32, 0x224422);
    this.drawButton(this.editBtnGfx, 288, 371, 44, 32, 0x3a2a1a);

    this.confirmHit.on('pointerdown', () => {
      if (this.onConfirm) this.onConfirm(this.transcript);
    });
    this.editHit.on('pointerdown', () => {
      if (this.onEdit) this.onEdit(this.transcript);
    });

    // Hide confirm/edit by default
    this.setConfirmVisible(false);

    // --- Mic orb (bottom-right, replaces action button) ---
    this.micContainer = scene.add.container(0, 0);
    this.micContainer.setDepth(210);
    this.micContainer.setVisible(false);

    const micX = 300;
    const micY = 565;

    this.micRing = scene.add.circle(micX, micY, 30);
    this.micRing.setStrokeStyle(2, 0xff8844, 0.3);
    this.micRing.setScrollFactor(0);
    this.micContainer.add(this.micRing);

    this.micBtn = scene.add.circle(micX, micY, 26, 0xff6633, 0.4);
    this.micBtn.setScrollFactor(0).setInteractive();
    this.micContainer.add(this.micBtn);

    this.micIcon = scene.add.text(micX, micY, '\uD83C\uDFA4', {
      fontSize: '20px'
    }).setOrigin(0.5).setScrollFactor(0);
    this.micContainer.add(this.micIcon);

    // Pulsing animation for mic ring
    this.micPulseTween = scene.tweens.add({
      targets: this.micRing,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true
    });

    this.micBtn.on('pointerdown', () => this.onMicTap());

    // --- Thinking indicator (dots that animate) ---
    this.thinkingContainer = scene.add.container(0, 0);
    this.thinkingContainer.setDepth(205);
    this.thinkingContainer.setVisible(false);

    this.thinkingDots = [];
    for (let i = 0; i < 3; i++) {
      const dot = scene.add.circle(165 + i * 16, 470, 5, 0xffcc88, 0.6);
      this.thinkingContainer.add(dot);
      this.thinkingDots.push(dot);

      scene.tweens.add({
        targets: dot,
        y: dot.y - 8,
        alpha: 1,
        duration: 400,
        yoyo: true,
        repeat: -1,
        delay: i * 150,
        ease: 'Sine.easeInOut'
      });
    }

    // Thinking background
    this.thinkingBg = scene.add.graphics();
    this.thinkingBg.fillStyle(0x1a1a2e, 0.9);
    this.thinkingBg.fillRoundedRect(140, 455, 80, 35, 12);
    this.thinkingContainer.addAt(this.thinkingBg, 0);

    // --- Text input overlay (for edit mode) ---
    this.editMode = false;

    // Setup Web Speech API
    this.setupSpeechRecognition();
  }

  drawButton(gfx, x, y, w, h, color) {
    gfx.clear();
    gfx.fillStyle(color, 0.9);
    gfx.fillRoundedRect(x, y, w, h, 8);
    gfx.lineStyle(1, 0x6a5a8a, 0.6);
    gfx.strokeRoundedRect(x, y, w, h, 8);
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.speechSupported = false;
      return;
    }

    this.speechSupported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false;

    this.recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      this.onSpeechResult(text);
    };

    this.recognition.onerror = (event) => {
      this.stopListening();
      // On error, open text input as fallback
      if (event.error !== 'aborted') {
        this.openTextInput();
      }
    };

    this.recognition.onend = () => {
      this.stopListening();
    };
  }

  onMicTap() {
    if (this.isListening) {
      this.stopListening();
      return;
    }

    if (this.speechSupported) {
      this.startListening();
    } else {
      this.openTextInput();
    }
  }

  startListening() {
    if (!this.recognition) return;
    this.isListening = true;
    this.micBtn.setFillStyle(0xff4422, 0.7);
    this.micPulseTween.resume();

    try {
      this.recognition.start();
    } catch (e) {
      // Already started
      this.stopListening();
      this.openTextInput();
    }
  }

  stopListening() {
    this.isListening = false;
    this.micBtn.setFillStyle(0xff6633, 0.4);
    this.micPulseTween.pause();
    this.micRing.setScale(1);

    try {
      if (this.recognition) this.recognition.stop();
    } catch (e) { /* ignore */ }
  }

  onSpeechResult(text) {
    this.transcript = text;
    this.showChildBubble(text);
    this.setConfirmVisible(true);
  }

  openTextInput() {
    // Create a native prompt for text input (simple fallback)
    const text = window.prompt('Type what your child wants to say:');
    if (text && text.trim()) {
      this.transcript = text.trim();
      this.showChildBubble(this.transcript);
      this.setConfirmVisible(true);
    }
  }

  showChildBubble(text) {
    this.childBubbleText.setText(text);

    // Size the bubble to fit text
    const bounds = this.childBubbleText.getBounds();
    const padding = 12;
    const bw = Math.min(bounds.width + padding * 2, 270);
    const bh = bounds.height + padding * 2;
    const bx = 180 - bw / 2;
    const by = 395 - bh;

    this.childBubbleGfx.clear();
    this.childBubbleGfx.fillStyle(0x2a2a4a, 0.9);
    this.childBubbleGfx.fillRoundedRect(bx, by, bw, bh, 10);
    this.childBubbleGfx.lineStyle(1, 0x6688cc, 0.5);
    this.childBubbleGfx.strokeRoundedRect(bx, by, bw, bh, 10);

    this.childBubbleText.setVisible(true);
    this.childBubbleGfx.setVisible(true);
  }

  hideChildBubble() {
    this.childBubbleText.setVisible(false);
    this.childBubbleGfx.setVisible(false);
  }

  setConfirmVisible(visible) {
    this.confirmBtnGfx.setVisible(visible);
    this.confirmHit.setVisible(visible);
    this.confirmText.setVisible(visible);
    this.editBtnGfx.setVisible(visible);
    this.editHit.setVisible(visible);
    this.editText.setVisible(visible);
  }

  // --- Public API ---

  show(onConfirm) {
    this.onConfirm = onConfirm;
    this.onEdit = (currentText) => {
      const edited = window.prompt('Edit the message:', currentText);
      if (edited && edited.trim()) {
        this.transcript = edited.trim();
        this.showChildBubble(this.transcript);
      }
    };
    this.transcript = '';
    this.hideChildBubble();
    this.setConfirmVisible(false);
    this.container.setVisible(true);
    this.micContainer.setVisible(true);
  }

  hide() {
    this.stopListening();
    this.container.setVisible(false);
    this.micContainer.setVisible(false);
    this.thinkingContainer.setVisible(false);
    this.hideChildBubble();
    this.setConfirmVisible(false);
    this.onConfirm = null;
    this.onEdit = null;
  }

  showThinking() {
    this.thinkingContainer.setVisible(true);
    this.setConfirmVisible(false);
    this.micContainer.setVisible(false);
  }

  hideThinking() {
    this.thinkingContainer.setVisible(false);
    this.micContainer.setVisible(true);
  }

  isMicVisible() {
    return this.micContainer.visible;
  }
}
