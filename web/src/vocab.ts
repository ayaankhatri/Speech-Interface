// Vocabulary mirrored from the Python package (lib/wordData.py) so the demo
// stream speaks the same words the sEMG classifier is trained on.

export const CORE_WORDS = [
  "yes",
  "no",
  "help",
  "water",
  "stop",
  "more",
  "hello",
  "how",
  "are",
  "you",
  "okay",
] as const;

export const EXTRA_WORDS = [
  "pain",
  "call",
  "bathroom",
  "thanks",
  "hungry",
  "tired",
] as const;

export const FULL_WORDS = [...CORE_WORDS, ...EXTRA_WORDS];

// Phonetically-similar neighbours used to fake the classifier's top-K
// probability list for the "Probabilistic Words" panel.
const NEIGHBOURS: Record<string, string[]> = {
  hello: ["hallo", "halo", "help", "hell"],
  help: ["held", "helm", "kelp", "hemp"],
  water: ["waiter", "wader", "later", "walter"],
  yes: ["yep", "yeah", "guess", "less"],
  no: ["know", "now", "not", "nope"],
  stop: ["step", "shop", "top", "stomp"],
  more: ["mor", "moor", "sore", "mare"],
  how: ["howdy", "hows", "now", "who"],
  are: ["air", "our", "aar", "err"],
  you: ["yew", "ewe", "your", "yous"],
  okay: ["oka", "okey", "okra", "cocoa"],
  pain: ["pane", "main", "rain", "paint"],
  call: ["cull", "coal", "tall", "cal"],
  bathroom: ["ballroom", "bathrobe", "bedroom", "bath"],
  thanks: ["tanks", "thank", "ranks", "franks"],
  hungry: ["angry", "hunger", "hungary", "gungy"],
  tired: ["tried", "fired", "tide", "wired"],
};

/** Build up to five ranked candidates for a detected word, best first. */
export function probabilisticWordsFor(word: string): string[] {
  if (!word) return [];
  const extras = NEIGHBOURS[word.toLowerCase()] ?? [];
  return [word, ...extras].slice(0, 5);
}

export function randomWord(): string {
  return FULL_WORDS[Math.floor(Math.random() * FULL_WORDS.length)];
}
