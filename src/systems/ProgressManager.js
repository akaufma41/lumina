const STORAGE_KEY = 'lumina_progress';

export class ProgressManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return { completed: {} };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { /* storage full or blocked */ }
  }

  isCompleted(id) {
    return !!this.data.completed[id];
  }

  markCompleted(id) {
    this.data.completed[id] = true;
    this.save();
  }

  getTotalCompleted() {
    return Object.keys(this.data.completed).length;
  }

  getWorldTier() {
    const total = this.getTotalCompleted();
    if (total >= 20) return 4;
    if (total >= 15) return 3;
    if (total >= 10) return 2;
    if (total >= 5) return 1;
    return 0;
  }

  checkMilestone(previousTotal) {
    const current = this.getTotalCompleted();
    const milestones = [5, 10, 15, 20];
    for (const m of milestones) {
      if (previousTotal < m && current >= m) return m;
    }
    return null;
  }

  resetAll() {
    this.data = { completed: {} };
    this.save();
  }
}
