import { NETLIST_EXAMPLES } from './netlistExamples.js';

const EMBEDDING_SIZE = 96;
const EPSILON = 1e-9;

const SEMANTIC_ANCHORS = [
  { key: 'amplifier', words: ['amplifier', 'gain', 'stage', 'preamp'] },
  { key: 'bjt', words: ['bjt', 'transistor', 'npn', 'pnp', 'common-emitter', 'ce'] },
  { key: 'mosfet', words: ['mosfet', 'nmos', 'pmos', 'gate', 'source', 'drain'] },
  { key: 'filter', words: ['filter', 'low-pass', 'high-pass', 'cutoff', 'rc'] },
  { key: 'bias', words: ['bias', 'divider', 'quiescent', 'dc', 'operating'] },
  { key: 'opamp', words: ['opamp', 'op-amp', 'inverting', 'noninverting', 'feedback'] },
  { key: 'rectifier', words: ['rectifier', 'diode', 'ac-dc', 'ripple'] },
  { key: 'power', words: ['power', 'supply', 'vcc', 'vee', 'rail'] },
  { key: 'transient', words: ['tran', 'transient', 'time-domain', 'step-response'] },
  { key: 'frequency', words: ['ac', 'frequency', 'bode', 'sine', 'sinusoidal'] }
];

const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (text) => normalize(text).split(' ').filter(Boolean);

function hashToken(token) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function l2Normalize(vec) {
  let sumSquares = 0;
  for (let i = 0; i < vec.length; i += 1) {
    sumSquares += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSquares) || 1;
  return vec.map((v) => v / norm);
}

export function embedSentence(sentence) {
  const tokens = tokenize(sentence);
  const vector = new Array(EMBEDDING_SIZE).fill(0);

  tokens.forEach((token) => {
    const idx = hashToken(token) % EMBEDDING_SIZE;
    vector[idx] += 1;
  });

  const anchorProjection = {};
  SEMANTIC_ANCHORS.forEach((anchor, index) => {
    const score = anchor.words.reduce((acc, word) => {
      const matchCount = tokens.filter((t) => t === word || t.includes(word)).length;
      return acc + matchCount;
    }, 0);

    if (score > 0) {
      vector[index] += score * 2;
    }
    anchorProjection[anchor.key] = score;
  });

  return {
    vector: l2Normalize(vector),
    tokens,
    anchorProjection
  };
}

function cosineDistance(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB) + EPSILON;
  const cosineSimilarity = dot / denom;
  return 1 - cosineSimilarity;
}

const EXAMPLE_EMBEDDINGS = NETLIST_EXAMPLES.map((example) => {
  const sourceText = [example.title, example.description, ...(example.tags || [])].join(' ');
  const embedded = embedSentence(sourceText);
  return {
    ...example,
    vector: embedded.vector,
    anchorProjection: embedded.anchorProjection
  };
});

export function retrieveClosestExamples(userQuery, limit = 2) {
  const queryEmbedding = embedSentence(userQuery);

  const ranked = EXAMPLE_EMBEDDINGS
    .map((example) => ({
      ...example,
      distance: cosineDistance(queryEmbedding.vector, example.vector)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.max(1, limit));

  return {
    queryEmbedding,
    matches: ranked
  };
}

export function getExamplesPromptBlock(matches) {
  if (!matches?.length) return '';

  return matches
    .map((match, index) => [
      `Example ${index + 1}: ${match.title}`,
      `Distance: ${match.distance.toFixed(4)}`,
      match.netlist
    ].join('\n'))
    .join('\n\n');
}
