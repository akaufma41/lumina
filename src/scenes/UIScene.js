import Phaser from 'phaser';
import { ReadingDialogueBox } from '../ui/ReadingDialogueBox.js';
import { ConversationUI } from '../ui/ConversationUI.js';
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
    this.readingTracker = new ReadingTracker();

    // Wire parent star button to reading tracker
    this.dialogueBox.onParentConfirm((words) => {
      this.readingTracker.confirmWords(words);
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

  showConversation(onConfirm) {
    this.conversationUI.show(onConfirm);
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
}
