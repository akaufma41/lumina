const STORAGE_KEY = 'lumina_quests';

export class QuestManager {
  constructor(questChain) {
    this.chain = questChain;
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return {
      currentQuestIndex: -1,  // -1 = not started, 0-4 = active, 5 = all done
      completedQuests: [],
      npcIntroSeen: {},
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { /* storage full or blocked */ }
  }

  getCurrentQuest() {
    if (this.data.currentQuestIndex < 0) return null;
    if (this.data.currentQuestIndex >= this.chain.length) return null;
    return this.chain[this.data.currentQuestIndex];
  }

  startFirstQuest() {
    this.data.currentQuestIndex = 0;
    this.save();
  }

  completeCurrentQuest() {
    const quest = this.getCurrentQuest();
    if (!quest) return null;
    this.data.completedQuests.push(quest.id);
    this.data.currentQuestIndex++;
    this.save();
    return quest;
  }

  isQuestTarget(npcId) {
    const quest = this.getCurrentQuest();
    return quest && quest.target === npcId;
  }

  markIntroSeen(npcId) {
    this.data.npcIntroSeen[npcId] = true;
    this.save();
  }

  hasSeenIntro(npcId) {
    return !!this.data.npcIntroSeen[npcId];
  }

  isAllComplete() {
    return this.data.currentQuestIndex >= this.chain.length;
  }

  getCompletedCount() {
    return this.data.completedQuests.length;
  }
}
