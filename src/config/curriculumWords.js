// Placeholder Phase 1 word lists — full adaptive engine is Step 7
// These words are highlighted in NPC dialogue so the child notices them

export const CURRICULUM_PHASE_1 = {
  cvcWords: [
    'cat', 'dog', 'sun', 'run', 'big', 'red', 'hat', 'sit',
    'hot', 'cup', 'map', 'bed', 'pig', 'bug', 'log', 'hug',
    'bat', 'fan', 'pen', 'top', 'mud', 'rug', 'van', 'web',
  ],
  sightWords: [
    'the', 'and', 'you', 'see', 'can', 'not', 'but', 'was',
    'all', 'she', 'her', 'one', 'two', 'who', 'how', 'did',
  ],
  forestWords: [
    'tree', 'leaf', 'star', 'moon', 'fire', 'pond', 'fern',
    'moth', 'glow', 'path', 'root', 'bark', 'seed', 'wind',
    'bird', 'owl', 'fox', 'dark', 'dew', 'rain', 'nest',
    'lost', 'help', 'find', 'here', 'come', 'look', 'hear',
    'soft', 'warm', 'cool', 'old', 'new', 'glad', 'safe',
  ],
};

let _cachedSet = null;

export function getCurriculumSet() {
  if (_cachedSet) return _cachedSet;
  const all = [
    ...CURRICULUM_PHASE_1.cvcWords,
    ...CURRICULUM_PHASE_1.sightWords,
    ...CURRICULUM_PHASE_1.forestWords,
  ];
  _cachedSet = new Set(all.map(w => w.toLowerCase()));
  return _cachedSet;
}

// Given a text string, return curriculum words found in it (max 3)
export function findCurriculumWords(text, maxCount = 3) {
  const set = getCurriculumSet();
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  const found = [];
  const seen = new Set();

  for (const w of words) {
    if (set.has(w) && !seen.has(w)) {
      found.push(w);
      seen.add(w);
      if (found.length >= maxCount) break;
    }
  }
  return found;
}
