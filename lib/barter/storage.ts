import type { BarterRate, CartCard } from '@/types/barter';

const RATES_KEY = 'barter:rates';
const FREQ_KEY = 'barter:freq';
const AS_LEAF_KEY = 'barter:asLeaf';
const TICKS_KEY = 'barter:ticks';
const CARDS_KEY = 'barter:cards';

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function loadRates(): Record<string, BarterRate> {
  return safeRead<Record<string, BarterRate>>(RATES_KEY, {});
}

export function saveRate(name: string, rate: BarterRate): void {
  const all = loadRates();
  all[name] = rate;
  safeWrite(RATES_KEY, all);
}

export function loadFreq(): Record<string, number> {
  return safeRead<Record<string, number>>(FREQ_KEY, {});
}

export function bumpFreq(name: string): void {
  const all = loadFreq();
  all[name] = (all[name] ?? 0) + 1;
  safeWrite(FREQ_KEY, all);
}

export function loadCards(): CartCard[] {
  return safeRead<CartCard[]>(CARDS_KEY, []);
}

export function saveCards(cards: CartCard[]): void {
  safeWrite(CARDS_KEY, cards);
}

export function loadTicks(): Record<string, number> {
  return safeRead<Record<string, number>>(TICKS_KEY, {});
}

export function saveTicks(name: string, ticks: number): void {
  const all = loadTicks();
  all[name] = ticks;
  safeWrite(TICKS_KEY, all);
}

export function loadAsLeaf(): Set<string> {
  return new Set(safeRead<string[]>(AS_LEAF_KEY, []));
}

export function saveAsLeaf(set: Set<string>): void {
  safeWrite(AS_LEAF_KEY, Array.from(set));
}

export function topFreq(n: number): string[] {
  const all = loadFreq();
  return Object.entries(all)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);
}
