import rawData from '@/constants/saleRotation.json';
import legacyCombinations from '@/constants/combinations.json';

export type CombinationBook = { 쉬움?: string; 보통?: string; 어려움?: string };

type RotationRow = {
  city: string | null;
  easy: (string | null)[];
  medium: (string | null)[];
  hard: (string | null)[];
};

type RotationData = {
  epochUtcMs: number;
  blocks: { startRow: number; groupSize: number }[];
  rows: RotationRow[];
  cityIndex: Record<string, number>;
  cityAliases: Record<string, string>;
};

const data = rawData as RotationData;
const legacy = legacyCombinations as Record<string, CombinationBook>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKstWeekStartMs(now: number): number {
  const kstNow = new Date(now + KST_OFFSET_MS);
  const dow = kstNow.getUTCDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const kstMidnightUtc = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
  );
  return kstMidnightUtc - daysFromMon * 86400000 - KST_OFFSET_MS;
}

function findBlockFor(rowIdx: number) {
  return data.blocks.find(
    (b) => rowIdx >= b.startRow && rowIdx < b.startRow + b.groupSize,
  );
}

function resolveCityAlias(cityName: string): string {
  return data.cityAliases[cityName] ?? cityName;
}

export function getRotatedRowIndex(cityName: string, now: number): number | null {
  const target = resolveCityAlias(cityName);
  const baseRow = data.cityIndex[target];
  if (baseRow === undefined) return null;
  const block = findBlockFor(baseRow);
  if (!block) return null;
  const monday = getKstWeekStartMs(now);
  const weeks = Math.floor((monday - data.epochUtcMs) / WEEK_MS);
  const shift = ((weeks % block.groupSize) + block.groupSize) % block.groupSize;
  const posInGroup = baseRow - block.startRow;
  const refPos =
    (((posInGroup - shift) % block.groupSize) + block.groupSize) % block.groupSize;
  return block.startRow + refPos;
}

export function getCityCombination(
  cityName: string,
  now: number = Date.now(),
): CombinationBook | null {
  const rotatedIdx = getRotatedRowIndex(cityName, now);
  if (rotatedIdx !== null) {
    const r = data.rows[rotatedIdx];
    return {
      쉬움: r.easy.filter((x): x is string => Boolean(x)).join(' '),
      보통: r.medium.filter((x): x is string => Boolean(x)).join(' '),
      어려움: r.hard.filter((x): x is string => Boolean(x)).join(' '),
    };
  }
  return legacy[cityName] ?? null;
}

export function hasCityCombination(cityName: string): boolean {
  const target = resolveCityAlias(cityName);
  return target in data.cityIndex || cityName in legacy;
}
