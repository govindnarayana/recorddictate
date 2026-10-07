import type { SymbolMap } from '../types/dictation';

// Default symbol -> spoken word mapping (Section 13 of the spec).
// Order matters for multi-character symbols in textProcessor's replacement pass,
// but this map itself is just a lookup table.
export const DEFAULT_SYMBOL_MAP: SymbolMap = {
  ',': 'comma',
  '.': 'full stop',
  '?': 'question mark',
  '!': 'exclamation mark',
  ':': 'colon',
  ';': 'semicolon',
  '-': 'hyphen',
  '—': 'dash',
  '–': 'dash',
  '(': 'open bracket',
  ')': 'close bracket',
  '[': 'open square bracket',
  ']': 'close square bracket',
  '{': 'open curly bracket',
  '}': 'close curly bracket',
  '/': 'slash',
  '\\': 'backslash',
  '%': 'percentage',
  '+': 'plus',
  '=': 'equals',
  '×': 'multiplied by',
  '÷': 'divided by',
  '<': 'less than',
  '>': 'greater than',
  '≤': 'less than or equal to',
  '≥': 'greater than or equal to',
  '₹': 'rupees',
  $: 'dollars',
  '@': 'at',
  '#': 'hash',
  '&': 'and',
  '*': 'asterisk',
  _: 'underscore',
  '"': 'double quote',
  "'": 'apostrophe',
};

/** Punctuation that Natural Mode treats as "safe to drop" (not spoken aloud). */
export const SILENT_IN_NATURAL_MODE = new Set([
  ',',
  '.',
  ';',
  ':',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  '"',
  "'",
  '-',
  '—',
  '–',
]);

/** Punctuation that even Natural Mode keeps audible because it changes meaning/intonation. */
export const ALWAYS_SPOKEN = new Set(['?', '!']);

export function getSymbolWord(symbol: string, map: SymbolMap): string | undefined {
  return map[symbol] ?? DEFAULT_SYMBOL_MAP[symbol];
}

export function mergeSymbolMap(overrides: SymbolMap): SymbolMap {
  return { ...DEFAULT_SYMBOL_MAP, ...overrides };
}
