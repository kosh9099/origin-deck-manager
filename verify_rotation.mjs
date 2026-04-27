// Standalone verification of rotation logic. Reads saleRotation.json and replicates the TS logic.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, 'constants/saleRotation.json'), 'utf-8'));

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKstWeekStartMs(now) {
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

function findBlockFor(rowIdx) {
  return data.blocks.find(b => rowIdx >= b.startRow && rowIdx < b.startRow + b.groupSize);
}

function resolveCityAlias(cityName) {
  return data.cityAliases[cityName] ?? cityName;
}

function getRotatedRowIndex(cityName, now) {
  const target = resolveCityAlias(cityName);
  const baseRow = data.cityIndex[target];
  if (baseRow === undefined) return null;
  const block = findBlockFor(baseRow);
  if (!block) return null;
  const monday = getKstWeekStartMs(now);
  const weeks = Math.floor((monday - data.epochUtcMs) / WEEK_MS);
  const shift = ((weeks % block.groupSize) + block.groupSize) % block.groupSize;
  const posInGroup = baseRow - block.startRow;
  const refPos = (((posInGroup - shift) % block.groupSize) + block.groupSize) % block.groupSize;
  return block.startRow + refPos;
}

function getCityCombination(cityName, now) {
  const idx = getRotatedRowIndex(cityName, now);
  if (idx === null) return null;
  const r = data.rows[idx];
  return {
    쉬움: r.easy.filter(Boolean).join(' '),
    보통: r.medium.filter(Boolean).join(' '),
    어려움: r.hard.filter(Boolean).join(' '),
  };
}

// week 0 reference: 2025-01-06 KST 00:00 (월요일, 첫 양수 주차)
const WEEK0 = Date.UTC(2025, 0, 6) - KST_OFFSET_MS;

let failures = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.log('✗', name, '—', e.message);
    failures++;
  }
};

test('week 0 (2025-01-06): 런던 → row 0 (자기자신)', () => {
  const idx = getRotatedRowIndex('런던', WEEK0);
  if (idx !== 0) throw new Error(`expected 0, got ${idx}`);
});

test('week 0: 보르도 → row 9 (자기자신)', () => {
  const baseRow = data.cityIndex['보르도'];
  const idx = getRotatedRowIndex('보르도', WEEK0);
  if (idx !== baseRow) throw new Error(`expected ${baseRow}, got ${idx}`);
});

test('week 0: 모든 도시는 자기 baseRow', () => {
  for (const [city, baseRow] of Object.entries(data.cityIndex)) {
    const idx = getRotatedRowIndex(city, WEEK0);
    if (idx !== baseRow) throw new Error(`${city}: expected ${baseRow}, got ${idx}`);
  }
});

test('groupSize=10: 런던 10주 후 자기자신 복귀', () => {
  const idx = getRotatedRowIndex('런던', WEEK0 + 10 * WEEK_MS);
  if (idx !== 0) throw new Error(`expected 0, got ${idx}`);
});

test('groupSize=15: 바르도 15주 후 자기자신 복귀', () => {
  const baseRow = data.cityIndex['바르도'];
  const idx = getRotatedRowIndex('바르도', WEEK0 + 15 * WEEK_MS);
  if (idx !== baseRow) throw new Error(`expected ${baseRow}, got ${idx}`);
});

test('groupSize=5: 바르나 5주 후 자기자신 복귀', () => {
  const baseRow = data.cityIndex['바르나'];
  const idx = getRotatedRowIndex('바르나', WEEK0 + 5 * WEEK_MS);
  if (idx !== baseRow) throw new Error(`expected ${baseRow}, got ${idx}`);
});

test('week 1: 런던 (posInGroup=0, shift=1, refPos=9) → row 9', () => {
  const idx = getRotatedRowIndex('런던', WEEK0 + WEEK_MS);
  if (idx !== 9) throw new Error(`expected 9, got ${idx}`);
});

test('alias: 쾰른 → 낭트와 같은 결과', () => {
  const koln = getCityCombination('쾰른', Date.now());
  const nantes = getCityCombination('낭트', Date.now());
  if (JSON.stringify(koln) !== JSON.stringify(nantes)) {
    throw new Error(`mismatch: ${JSON.stringify(koln)} vs ${JSON.stringify(nantes)}`);
  }
});

test('alias: 스트라스부르 → 낭트와 같은 결과', () => {
  const s = getCityCombination('스트라스부르', Date.now());
  const n = getCityCombination('낭트', Date.now());
  if (JSON.stringify(s) !== JSON.stringify(n)) throw new Error('mismatch');
});

test('미등록 도시: null 반환', () => {
  const idx = getRotatedRowIndex('존재하지않는도시', Date.now());
  if (idx !== null) throw new Error(`expected null, got ${idx}`);
});

test('주차 음수 보정: epoch(2025-01-01) 시점 weeks=-1, shift=9', () => {
  // 런던 row 0, shift=9, refPos = (0-9+10) mod 10 = 1
  const idx = getRotatedRowIndex('런던', data.epochUtcMs);
  if (idx !== 1) throw new Error(`expected 1, got ${idx}`);
});

test('블록 경계: 런던 블록(0-9) 회전이 옆 블록 침범 안 함', () => {
  // 모든 shift 0..9에 대해 런던의 결과 row가 [0..9] 범위에 있어야 함
  for (let s = 0; s < 10; s++) {
    const idx = getRotatedRowIndex('런던', WEEK0 + s * WEEK_MS);
    if (idx < 0 || idx > 9) throw new Error(`shift ${s}: row ${idx} out of [0..9]`);
  }
});

test('블록 경계: 바르도 블록(20-34) 회전이 [20..34] 범위', () => {
  for (let s = 0; s < 15; s++) {
    const idx = getRotatedRowIndex('바르도', WEEK0 + s * WEEK_MS);
    if (idx < 20 || idx > 34) throw new Error(`shift ${s}: row ${idx} out of [20..34]`);
  }
});

// 현재 주차 정보
const now = Date.now();
const monday = getKstWeekStartMs(now);
const weeks = Math.floor((monday - data.epochUtcMs) / WEEK_MS);
console.log('\n=== 현재 주차 정보 ===');
console.log('이번 주 KST 월요일 (UTC):', new Date(monday).toISOString());
console.log('epoch 기준 경과 주차:', weeks);

console.log('\n=== 현재 주 런던 ===');
console.log(getCityCombination('런던', now));
console.log('\n=== 현재 주 낭트 ===');
console.log(getCityCombination('낭트', now));
console.log('\n=== 현재 주 쾰른 (alias→낭트) ===');
console.log(getCityCombination('쾰른', now));

console.log(`\n${failures === 0 ? '✅ 전체 통과' : `❌ ${failures}개 실패`}`);
process.exit(failures === 0 ? 0 : 1);
