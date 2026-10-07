import type { SpeechMode, SymbolMap } from '../types/dictation';
import { ALWAYS_SPOKEN, SILENT_IN_NATURAL_MODE, getSymbolWord } from '../utils/punctuation';

// Common unit abbreviations spoken out in Natural/Dictation mode so numbers
// read naturally (Section 25: "5V" -> "five volts"). Exact Mode leaves the
// literal characters as close to verbatim as SpeechSynthesis will allow,
// only expanding what's needed for intelligibility (symbol dictionary use).
const UNIT_WORDS: Record<string, string> = {
  V: 'volts',
  A: 'amperes',
  W: 'watts',
  Hz: 'hertz',
  kg: 'kilograms',
  g: 'grams',
  m: 'meters',
  cm: 'centimeters',
  mm: 'millimeters',
  km: 'kilometers',
  s: 'seconds',
  ms: 'milliseconds',
  N: 'newtons',
  J: 'joules',
  Pa: 'pascals',
  K: 'kelvin',
  mol: 'moles',
  L: 'liters',
  ml: 'milliliters',
  Ω: 'ohms',
};

const NUMBER_UNIT_RE = new RegExp(
  `\\b(\\d+(?:\\.\\d+)?)(${Object.keys(UNIT_WORDS).join('|')})\\b`,
  'g',
);

function expandNumberUnits(text: string): string {
  return text.replace(NUMBER_UNIT_RE, (_match, num: string, unit: string) => {
    const word = UNIT_WORDS[unit];
    return word ? `${num} ${word}` : `${num}${unit}`;
  });
}

const PUNCT_RE = /([,.!?;:()[\]{}"'/\\%+=×÷<>≤≥₹$@#&*_—–-])/g;

/**
 * Converts the original PDF line text into text suitable for
 * SpeechSynthesis, according to the active speech mode. The original text
 * (used for highlighting/display) is never mutated by this function.
 */
export function toSpeechText(original: string, mode: SpeechMode, symbolMap: SymbolMap): string {
  const text = expandNumberUnits(original);

  if (mode === 'natural') {
    return text
      .replace(PUNCT_RE, (sym) => {
        if (ALWAYS_SPOKEN.has(sym)) return sym;
        if (SILENT_IN_NATURAL_MODE.has(sym)) return sym === '-' ? ' ' : '';
        // Symbols not explicitly categorized (math/currency/etc.) still get
        // spoken in Natural mode since dropping them would change meaning.
        const word = getSymbolWord(sym, symbolMap);
        return word ? ` ${word} ` : sym;
      })
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (mode === 'dictation') {
    return text
      .replace(PUNCT_RE, (sym) => {
        const word = getSymbolWord(sym, symbolMap);
        return word ? `, ${word},` : sym;
      })
      .replace(/\s+/g, ' ')
      .replace(/\s+,/g, ',')
      .trim();
  }

  // Exact mode: announce every symbolic/mathematical character explicitly,
  // reading the literal structure (e.g. "V = I R" -> "V equals I R").
  return text
    .replace(PUNCT_RE, (sym) => {
      const word = getSymbolWord(sym, symbolMap);
      return word ? ` ${word} ` : sym;
    })
    .replace(/\s+/g, ' ')
    .trim();
}
