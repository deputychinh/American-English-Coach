import type { Phone, PhoneInventory } from '@/interfaces/scoring.interface';

/** Phone tables and mappings (port of backend/app/domain/phoneme_inventory.py). */

/** CMUdict tokens such as `AH0`, `T` → phones, keeping the stress digit. */
export const parseCmu = (tokens: string[]): Phone[] =>
  tokens.map((token) => {
    const last = token.at(-1) ?? '';
    return /\d/.test(last)
      ? { symbol: token.slice(0, -1), stress: Number(last) }
      : { symbol: token, stress: null };
  });

/** IPA shown to learners; schwa and r-coloured schwa when unstressed. */
export const phoneIpa = (phone: Phone, inventory: PhoneInventory): string => {
  const unstressed = inventory.unstressedIpa[phone.symbol];
  if (phone.stress === 0 && unstressed) return unstressed;
  return inventory.ipa[phone.symbol] ?? inventory.unknown;
};

export const isVowel = (symbol: string, inventory: PhoneInventory): boolean =>
  inventory.classes[symbol] === 'vowel';

export const phonemeClass = (symbol: string, inventory: PhoneInventory): string | null =>
  inventory.classes[symbol] ?? null;

const stripEnd = (text: string, characters: string): string => {
  let end = text.length;
  while (end > 0 && characters.includes(text[end - 1] ?? '')) end -= 1;
  return text.slice(0, end);
};

/** One model token: exact table, then the nearest-English table after stripping marks. */
export const normalizeToken = (token: string, inventory: PhoneInventory): string[] => {
  const exact = inventory.espeak[token];
  if (exact) return exact;
  let base = stripEnd(token, inventory.toneDigits);
  for (const mark of inventory.diacritics) base = base.split(mark).join('');
  if (base.endsWith('ɜ') && [...base].length > 1) base = [...base].slice(0, -1).join('');
  for (const candidate of [token, base]) {
    const mapped = inventory.espeak[candidate] ?? inventory.nearest[candidate];
    if (mapped) return mapped;
  }
  return [inventory.unknown];
};

/** Recognised model tokens → ARPAbet; unknown tokens become `?`. */
export const espeakToArpabet = (tokens: string[], inventory: PhoneInventory): string[] =>
  tokens.flatMap((token) => normalizeToken(token, inventory));

/** Every single-phone model token that realises an ARPAbet symbol (for merged posteriors). */
export const arpabetVariants = (symbol: string, inventory: PhoneInventory): string[] =>
  inventory.espeakOrder.filter((token) => {
    const mapped = inventory.espeak[token];
    return mapped?.length === 1 && mapped[0] === symbol;
  });
