import Phaser from 'phaser';
import { ReadingDialogueBox } from '../ui/ReadingDialogueBox.js';
import { ConversationUI } from '../ui/ConversationUI.js';
import { QuestHUD } from '../ui/QuestHUD.js';
import { DIALOGUE } from '../config/dialogueData.js';
import { findCurriculumWords } from '../config/curriculumWords.js';
import { ReadingTracker } from '../systems/ReadingTracker.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.dialogueBox = new ReadingDialogueBox(this);
    this.conversationUI = new ConversationUI(this);
    this.questHUD = new QuestHUD(this);
    this.readingTracker = new ReadingTracker();

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
}
