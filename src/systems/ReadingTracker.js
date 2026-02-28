const STORAGE_KEY = 'lumina_reading';

export class ReadingTracker {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return {
      wordsConfirmed: {},   // { "tree": { count: 3, lastSeen: timestamp } }
      totalConfirmations: 0,
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { /* storage full */ }
  }

  confirmWords(words) {
    const now = Date.now();
    for (const w of words) {
      const key = w.toLowerCase();
      if (!this.data.wordsConfirmed[key]) {
        this.data.wordsConfirmed[key] = { count: 0, lastSeen: 0 };
      }
      this.data.wordsConfirmed[key].count++;
      this.data.wordsConfirmed[key].lastSeen = now;
    }
    this.data.totalConfirmations++;
    this.save();
  }

  getTotalConfirmations() {
    return this.data.totalConfirmations;
  }

  getWordStats(word) {
    return this.data.wordsConfirmed[word.toLowerCase()] || null;
  }
}
