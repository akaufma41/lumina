import Phaser from 'phaser';
import { ReadingDialogueBox } from '../ui/ReadingDialogueBox.js';
import { ConversationUI } from '../ui/ConversationUI.js';
import { QuestHUD } from '../ui/QuestHUD.js';
import { CollectibleCounter } from '../ui/CollectibleCounter.js';
import { DIALOGUE } from '../config/dialogueData.js';
import { findCurriculumWords } from '../config/curriculumWords.js';
import { ReadingTracker } from '../systems/ReadingTracker.js';
import { QuestArrow } from '../ui/QuestArrow.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.dialogueBox = new ReadingDialogueBox(this);
    this.conversationUI = new ConversationUI(this);
    this.questHUD = new QuestHUD(this);
    this.collectibleCounter = new CollectibleCounter(this);
    this.readingTracker = new ReadingTracker();
    this.questArrow = new QuestArrow(this);

    // Wire parent star button to reading tracker + progress
    this.dialogueBox.onParentConfirm((words) => {
      this.readingTracker.confirmWords(words);

      // Also count toward world progression
      const forestScene = this.scene.get('ForestScene');
      if (forestScene && forestScene.progressManager) {
        const prev = forestScene.progressManager.getTotalCompleted();
        forestScene.progressManager.markCompleted('reading_' + Date.now());
        const milestone = forestScene.progressManager.checkMilestone(prev);
        if (milestone !== null) {
          const tier = forestScene.progressManager.getWorldTier();
          forestScene.atmosphereManager.applyTier(tier, true);
          forestScene.atmosphereManager.celebrateTierUp();
        }
      }
    });
  }

  // --- Dialogue methods ---

  showDialogueText(name, text) {
    const currWords = findCurriculumWords(text);
    this.dialogueBox.show(name, text, currWords);
  }

  showDialogue(npcId, lineIndex) {
    const data = DIALOGUE[npcId];
    const lines = data.intro;
    const currWords = findCurriculumWords(lines[lineIndex]);
    this.dialogueBox.show(data.name, lines[lineIndex], currWords);
  }

  advanceDialogue(npcId, lineIndex) {
    const data = DIALOGUE[npcId];
    const lines = data.intro;
    const currWords = findCurriculumWords(lines[lineIndex]);
    this.dialogueBox.show(data.name, lines[lineIndex], currWords);
  }

  hideDialogue() {
    this.dialogueBox.hide();
  }

  isTypewriting() {
    return this.dialogueBox.isRevealing();
  }

  completeTypewriter() {
    this.dialogueBox.completeReveal();
  }

  // --- Conversation methods ---

  showConversation(onConfirm, onExit, npcName) {
    this.conversationUI.show(onConfirm, onExit, npcName);
  }

  hideConversation() {
    this.conversationUI.hide();
  }

  showThinking() {
    this.conversationUI.showThinking();
  }

  hideThinking() {
    this.conversationUI.hideThinking();
  }

  hideChildBubble() {
    this.conversationUI.hideChildBubble();
  }

  // --- Quest HUD methods ---

  showQuest(text) {
    this.questHUD.show(text);
  }

  hideQuest() {
    this.questHUD.hide();
  }

  // --- Quest arrow methods ---

  showQuestArrow(targetNpcId, playerTileX, playerTileY) {
    this.questArrow.show(targetNpcId, playerTileX, playerTileY);
  }

  hideQuestArrow() {
    this.questArrow.hide();
  }

  // --- Tutorial prompt ---

  showTutorialPrompt(text) {
    if (this.tutorialPrompt) return;

    this.tutorialPrompt = this.add.text(180, 590, text, {
      fontSize: '18px',
      fontFamily: '"Crimson Text", Georgia, "Times New Roman", serif',
      color: '#ffcc88',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(200);

    // Fade in
    this.tweens.add({
      targets: this.tutorialPrompt,
      alpha: 1,
      duration: 500,
      ease: 'Sine.easeOut',
    });

    // Gentle pulse
    this.tweens.add({
      targets: this.tutorialPrompt,
      alpha: 0.5,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 500,
    });
  }

  hideTutorialPrompt() {
    if (!this.tutorialPrompt) return;

    this.tweens.killTweensOf(this.tutorialPrompt);
    const prompt = this.tutorialPrompt;
    this.tutorialPrompt = null;

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => prompt.destroy(),
    });
  }
}
