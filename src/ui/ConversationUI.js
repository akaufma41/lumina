const FONT = '"Crimson Text", Georgia, "Times New Roman", serif';

export class ConversationUI {
  constructor(scene) {
    this.scene = scene;
    this.onConfirm = null;
    this.onExit = null;
    this.transcript = '';
    this.isListening = false;
    this.recognition = null;
    this.npcName = '';
    this.retryCount = 0;
    this.maxRetries = 2;
    this.listenTimeout = null;

    // ─── MAIN CONTAINER ─────────────────────────────────
    this.container = scene.add.container(0, 0);
    this.container.setDepth(210);
    this.container.setVisible(false);

    // ─── CHILD SPEECH BUBBLE (above dialogue box) ───────
    this.childBubbleGfx = scene.add.graphics();
    this.container.add(this.childBubbleGfx);

    this.childBubbleText = scene.add.text(180, 418, '', {
      fontSize: '20px',
      fontFamily: FONT,
      color: '#eeddff',
      wordWrap: { width: 280 },
      align: 'center',
      resolution: 2,
    }).setOrigin(0.5, 1);
    this.container.add(this.childBubbleText);

    // ─── CONFIRM / EDIT BUTTONS ─────────────────────────
    // Confirm ✓
    this.confirmBtnGfx = scene.add.graphics();
    this.container.add(this.confirmBtnGfx);

    this.confirmHit = scene.add.circle(240, 410, 22, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.container.add(this.confirmHit);

    this.confirmText = scene.add.text(240, 410, '\u2713', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#44dd66',
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(0.5);
    this.container.add(this.confirmText);

    // Edit ✎
    this.editBtnGfx = scene.add.graphics();
    this.container.add(this.editBtnGfx);

    this.editHit = scene.add.circle(290, 410, 22, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.container.add(this.editHit);

    this.editText = scene.add.text(290, 410, '\u270E', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffcc88',
      resolution: 2,
    }).setOrigin(0.5);
    this.container.add(this.editText);

    // Button backgrounds
    this._drawButton(this.confirmBtnGfx, 218, 388, 44, 44, 0x1a2e1a);
    this._drawButton(this.editBtnGfx, 268, 388, 44, 44, 0x2e2a1a);

    this.confirmHit.on('pointerdown', () => {
      if (this.onConfirm) this.onConfirm(this.transcript);
    });
    this.editHit.on('pointerdown', () => {
      this.openTextInput(this.transcript);
    });

    this.setConfirmVisible(false);

    // ─── MIC ORB (center-bottom) ────────────────────────
    this.micContainer = scene.add.container(0, 0);
    this.micContainer.setDepth(210);
    this.micContainer.setVisible(false);

    const micX = 180;
    const micY = 580;

    // Outer glow ring
    this.micRing = scene.add.circle(micX, micY, 42);
    this.micRing.setStrokeStyle(3, 0xaa88cc, 0.4);
    this.micContainer.add(this.micRing);

    // Inner button
    this.micBtn = scene.add.circle(micX, micY, 36, 0x6633aa, 0.5);
    this.micBtn.setInteractive({ useHandCursor: true });
    this.micContainer.add(this.micBtn);

    // Mic icon
    this.micIcon = scene.add.text(micX, micY, '\uD83C\uDFA4', {
      fontSize: '28px',
    }).setOrigin(0.5);
    this.micContainer.add(this.micIcon);

    // Prompt text (e.g. "Talk to The Keeper!")
    this.promptText = scene.add.text(micX, micY - 54, '', {
      fontSize: '20px',
      fontFamily: FONT,
      color: '#ffcc88',
      resolution: 2,
    }).setOrigin(0.5);
    this.micContainer.add(this.promptText);

    // Status text (e.g. "Listening...", "I didn't hear you!")
    this.statusText = scene.add.text(micX, micY - 54, '', {
      fontSize: '18px',
      fontFamily: FONT,
      color: '#ff9966',
      resolution: 2,
    }).setOrigin(0.5).setVisible(false);
    this.micContainer.add(this.statusText);

    // Pulsing animation (paused by default)
    this.micPulseTween = scene.tweens.add({
      targets: this.micRing,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.8,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true,
    });

    this.micBtn.on('pointerdown', () => this.onMicTap());

    // ─── EXIT BUTTON (X) ────────────────────────────────
    this.exitContainer = scene.add.container(0, 0);
    this.exitContainer.setDepth(212);
    this.exitContainer.setVisible(false);

    const exitX = 335;
    const exitY = 530;

    const exitBg = scene.add.graphics();
    exitBg.fillStyle(0x2a1a3a, 0.8);
    exitBg.fillCircle(exitX, exitY, 18);
    exitBg.lineStyle(1.5, 0x6a5a8a, 0.6);
    exitBg.strokeCircle(exitX, exitY, 18);
    this.exitContainer.add(exitBg);

    this.exitText = scene.add.text(exitX, exitY, '\u2715', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#aa8899',
      resolution: 2,
    }).setOrigin(0.5);
    this.exitContainer.add(this.exitText);

    this.exitHit = scene.add.circle(exitX, exitY, 20, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.exitContainer.add(this.exitHit);

    this.exitHit.on('pointerdown', () => {
      if (this.onExit) this.onExit();
    });

    // ─── THINKING INDICATOR ─────────────────────────────
    this.thinkingContainer = scene.add.container(0, 0);
    this.thinkingContainer.setDepth(205);
    this.thinkingContainer.setVisible(false);

    // Background pill
    const thinkBg = scene.add.graphics();
    thinkBg.fillStyle(0x1a1a2e, 0.9);
    thinkBg.fillRoundedRect(148, 408, 64, 28, 12);
    thinkBg.lineStyle(1, 0x4a3a6a, 0.5);
    thinkBg.strokeRoundedRect(148, 408, 64, 28, 12);
    this.thinkingContainer.add(thinkBg);

    this.thinkingDots = [];
    for (let i = 0; i < 3; i++) {
      const dot = scene.add.circle(165 + i * 16, 422, 5, 0xffcc88, 0.6);
      this.thinkingContainer.add(dot);
      this.thinkingDots.push(dot);

      scene.tweens.add({
        targets: dot,
        y: dot.y - 6,
        alpha: 1,
        duration: 400,
        yoyo: true,
        repeat: -1,
        delay: i * 150,
        ease: 'Sine.easeInOut',
      });
    }

    // ─── TEXT INPUT OVERLAY (HTML) ───────────────────────
    this.textInputEl = null;

    // ─── SPEECH RECOGNITION ─────────────────────────────
    this.setupSpeechRecognition();
  }

  // ─── HELPERS ──────────────────────────────────────────

  _drawButton(gfx, x, y, w, h, color) {
    gfx.clear();
    gfx.fillStyle(color, 0.9);
    gfx.fillRoundedRect(x, y, w, h, 10);
    gfx.lineStyle(1.5, 0x6a5a8a, 0.6);
    gfx.strokeRoundedRect(x, y, w, h, 10);
  }

  setConfirmVisible(visible) {
    this.confirmBtnGfx.setVisible(visible);
    this.confirmHit.setVisible(visible);
    this.confirmText.setVisible(visible);
    this.editBtnGfx.setVisible(visible);
    this.editHit.setVisible(visible);
    this.editText.setVisible(visible);
  }

  // ─── SPEECH RECOGNITION ───────────────────────────────

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
      this._clearListenTimeout();
      const text = event.results[0][0].transcript;
      this.retryCount = 0;
      this.onSpeechResult(text);
    };

    this.recognition.onerror = (event) => {
      this._clearListenTimeout();
      this.stopListening();

      if (event.error === 'aborted') return;

      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        this._handleNoSpeech();
      } else {
        this.openTextInput();
      }
    };

    this.recognition.onend = () => {
      this._clearListenTimeout();
      if (this.isListening) {
        // Recognition ended without result — treat as no speech
        this.stopListening();
        this._handleNoSpeech();
      }
    };
  }

  _handleNoSpeech() {
    this.retryCount++;
    if (this.retryCount <= this.maxRetries) {
      // Show retry message
      this.statusText.setText("I didn't hear you!");
      this.statusText.setVisible(true);
      this.promptText.setVisible(false);
      // Auto-reset after 2 seconds
      this.scene.time.delayedCall(2000, () => {
        this.statusText.setVisible(false);
        this.promptText.setVisible(true);
      });
    } else {
      // Max retries — offer text input
      this.statusText.setText('Try typing instead!');
      this.statusText.setVisible(true);
      this.promptText.setVisible(false);
      this.scene.time.delayedCall(1500, () => {
        this.statusText.setVisible(false);
        this.promptText.setVisible(true);
        this.openTextInput();
      });
    }
  }

  _clearListenTimeout() {
    if (this.listenTimeout) {
      this.listenTimeout.remove();
      this.listenTimeout = null;
    }
  }

  // ─── MIC INTERACTION ──────────────────────────────────

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

    // Visual: orange glow, "Listening..." text
    this.micBtn.setFillStyle(0xff6633, 0.7);
    this.micRing.setStrokeStyle(3, 0xff8844, 0.8);
    this.micPulseTween.resume();
    this.statusText.setText('Listening...');
    this.statusText.setVisible(true);
    this.promptText.setVisible(false);

    // 8 second timeout
    this.listenTimeout = this.scene.time.delayedCall(8000, () => {
      if (this.isListening) {
        this.stopListening();
        this._handleNoSpeech();
      }
    });

    try {
      this.recognition.start();
    } catch (e) {
      this.stopListening();
      this.openTextInput();
    }
  }

  stopListening() {
    this.isListening = false;
    this._clearListenTimeout();

    // Visual: restore purple theme
    this.micBtn.setFillStyle(0x6633aa, 0.5);
    this.micRing.setStrokeStyle(3, 0xaa88cc, 0.4);
    this.micPulseTween.pause();
    this.micRing.setScale(1);
    this.statusText.setVisible(false);
    this.promptText.setVisible(true);

    try {
      if (this.recognition) this.recognition.stop();
    } catch (e) { /* ignore */ }
  }

  onSpeechResult(text) {
    this.transcript = text;
    this.showChildBubble(text);
    this.setConfirmVisible(true);
    this.micContainer.setVisible(false);
  }

  // ─── TEXT INPUT (replaces window.prompt) ───────────────

  openTextInput(prefill = '') {
    if (this.textInputEl) return; // already open

    // Hide mic while typing
    this.micContainer.setVisible(false);

    // Get the game canvas position
    const canvas = this.scene.game.canvas;
    const rect = canvas.getBoundingClientRect();

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: rgba(10, 8, 20, 0.7);
      z-index: 10000;
    `;

    // Create input wrapper
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      gap: 8px;
      padding: 12px;
      background: #1a1a2e;
      border: 2px solid #aa88cc;
      border-radius: 12px;
      width: 80%;
      max-width: 300px;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = prefill;
    input.placeholder = 'Type here...';
    input.style.cssText = `
      flex: 1;
      background: #2a1a3a;
      border: 1px solid #6a5a8a;
      border-radius: 8px;
      color: #eeddff;
      font-family: "Crimson Text", Georgia, serif;
      font-size: 18px;
      padding: 8px 12px;
      outline: none;
    `;

    const submitBtn = document.createElement('button');
    submitBtn.textContent = '\u2713';
    submitBtn.style.cssText = `
      background: #1a2e1a;
      border: 1px solid #44dd66;
      border-radius: 8px;
      color: #44dd66;
      font-size: 22px;
      padding: 4px 12px;
      cursor: pointer;
    `;

    const submit = () => {
      const text = input.value.trim();
      this._closeTextInput();
      if (text) {
        this.transcript = text;
        this.showChildBubble(text);
        this.setConfirmVisible(true);
      } else {
        this.micContainer.setVisible(true);
      }
    };

    submitBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this._closeTextInput();
        this.micContainer.setVisible(true);
      }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(submitBtn);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);
    this.textInputEl = overlay;

    // Focus input after a frame
    requestAnimationFrame(() => input.focus());
  }

  _closeTextInput() {
    if (this.textInputEl) {
      this.textInputEl.remove();
      this.textInputEl = null;
    }
  }

  // ─── CHILD BUBBLE ─────────────────────────────────────

  showChildBubble(text) {
    this.childBubbleText.setText(text);

    const bounds = this.childBubbleText.getBounds();
    const padding = 14;
    const bw = Math.min(bounds.width + padding * 2, 300);
    const bh = bounds.height + padding * 2;
    const bx = 180 - bw / 2;
    const by = 420 - bh;

    this.childBubbleGfx.clear();
    this.childBubbleGfx.fillStyle(0x2a1a3a, 0.92);
    this.childBubbleGfx.fillRoundedRect(bx, by, bw, bh, 10);
    this.childBubbleGfx.lineStyle(1.5, 0xaa88cc, 0.6);
    this.childBubbleGfx.strokeRoundedRect(bx, by, bw, bh, 10);

    this.childBubbleText.setVisible(true);
    this.childBubbleGfx.setVisible(true);
  }

  hideChildBubble() {
    this.childBubbleText.setVisible(false);
    this.childBubbleGfx.setVisible(false);
  }

  // ─── PUBLIC API ───────────────────────────────────────

  show(onConfirm, onExit, npcName = '') {
    this.onConfirm = onConfirm;
    this.onExit = onExit;
    this.npcName = npcName;
    this.transcript = '';
    this.retryCount = 0;

    // Set prompt text
    this.promptText.setText(npcName ? `Talk to ${npcName}!` : 'Say something!');
    this.promptText.setVisible(true);
    this.statusText.setVisible(false);

    this.hideChildBubble();
    this.setConfirmVisible(false);
    this.container.setVisible(true);
    this.micContainer.setVisible(true);
    this.exitContainer.setVisible(true);
  }

  hide() {
    this.stopListening();
    this._clearListenTimeout();
    this._closeTextInput();
    this.container.setVisible(false);
    this.micContainer.setVisible(false);
    this.exitContainer.setVisible(false);
    this.thinkingContainer.setVisible(false);
    this.hideChildBubble();
    this.setConfirmVisible(false);
    this.onConfirm = null;
    this.onExit = null;
  }

  showThinking() {
    this.thinkingContainer.setVisible(true);
    this.setConfirmVisible(false);
    this.micContainer.setVisible(false);
    this.exitContainer.setVisible(false);
    this.hideChildBubble();
  }

  hideThinking() {
    this.thinkingContainer.setVisible(false);
    // Don't show mic here — it's shown when showConversation() is called
    // during the conversation_listening phase
  }

  isMicVisible() {
    return this.micContainer.visible;
  }
}
