import Papa from 'papaparse';

export type ImportKind = 'sailors' | 'season_prices';

export type ImportIssue = {
  row: number;
  field?: string;
  message: string;
};

export type ParsedImport = {
  kind: ImportKind;
  headers: string[];
  unusedHeaders: string[];
  rows: Record<string, string>[];
  records: ImportRecord[];
  errors: ImportIssue[];
};

export type ImportRecord = SailorImportRecord | SeasonPriceImportRecord;

export type SailorImportRecord = {
  import_key: string;
  personal_id: string | null;
  name: string;
  grade: string;
  sailor_type: string | null;
  job: string | null;
  payload: Record<string, string | number | null>;
};

export type SeasonPriceImportRecord = {
  import_key: string;
  city: string;
  item_name: string;
  category: string | null;
  pandemic: string | null;
  base_price: number | null;
  pandemic_low: number | null;
  pandemic_high: number | null;
  boost_low: number | null;
  boost_high: number | null;
  payload: Record<string, string | number | null>;
};

const HEADER_ALIASES = {
  personalId: ['personal_id', 'personalid', 'personal id', '고유id', '고유 id', '개인id', '개인 id'],
  name: ['name', '이름', '항해사', '항해사명'],
  grade: ['grade', '등급', '랭크', 'rank'],
  type: ['type', '타입', '분류', '계열'],
  job: ['job', '직업', '클래스'],
  city: ['city', '도시', '항구', '항구명', 'port'],
  itemName: ['item_name', 'itemname', 'item name', '품목', '품목명', '교역품', 'name'],
  category: ['category', '카테고리', '분류', '종류'],
  pandemic: ['pandemic', '대유행', '유행'],
  basePrice: ['base_price', 'baseprice', 'base price', '기본가', '기본 가격'],
  pandemicLow: ['pandemic_low', 'pandemiclow', '대유행저가', '대유행 저가', '대유행하한', '대유행 하한'],
  pandemicHigh: ['pandemic_high', 'pandemichigh', '대유행고가', '대유행 고가', '대유행상한', '대유행 상한'],
  boostLow: ['boost_low', 'boostlow', '부스트저가', '부스트 저가', '부묵저가', '부묵 저가'],
  boostHigh: ['boost_high', 'boosthigh', '부스트고가', '부스트 고가', '부묵고가', '부묵 고가'],
} as const;

const SAILOR_FIELDS = ['personalId', 'name', 'grade', 'type', 'job'] as const;
const SEASON_FIELDS = [
  'city',
  'itemName',
  'category',
  'pandemic',
  'basePrice',
  'pandemicLow',
  'pandemicHigh',
  'boostLow',
  'boostHigh',
] as const;

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function cleanCell(value: unknown): string {
  if (value == null) return '';
  return String(value).replace(/^\uFEFF/, '').trim();
}

function toNumber(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickHeader(headers: string[], aliases: readonly string[]): string | null {
  const normalized = new Map(headers.map(header => [normalizeHeader(header), header]));
  for (const alias of aliases) {
    const found = normalized.get(normalizeHeader(alias));
    if (found) return found;
  }
  return null;
}

function parseRows(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const delimiter = text.includes('\t') ? '\t' : undefined;
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter,
    transformHeader: header => header.replace(/^\uFEFF/, '').trim(),
    transform: value => cleanCell(value),
  });

  const headers = (result.meta.fields ?? []).filter(Boolean);
  const rows = (result.data ?? []).filter(row =>
    Object.values(row).some(value => cleanCell(value).length > 0)
  );
  return { headers, rows };
}

function compactPayload(row: Record<string, string>): Record<string, string | number | null> {
  const payload: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(row)) {
    const cleaned = cleanCell(value);
    payload[key] = cleaned === '' ? null : cleaned;
  }
  return payload;
}

function findUnusedHeaders(headers: string[], used: Array<string | null>): string[] {
  const usedSet = new Set(used.filter((header): header is string => !!header));
  return headers.filter(header => !usedSet.has(header));
}

export function parseImportText(kind: ImportKind, text: string): ParsedImport {
  const { headers, rows } = parseRows(text);
  const errors: ImportIssue[] = [];

  if (headers.length === 0) {
    return { kind, headers, unusedHeaders: [], rows, records: [], errors: [{ row: 0, message: '헤더 행을 찾을 수 없습니다.' }] };
  }

  if (kind === 'sailors') return parseSailors(headers, rows, errors);
  return parseSeasonPrices(headers, rows, errors);
}

function parseSailors(headers: string[], rows: Record<string, string>[], errors: ImportIssue[]): ParsedImport {
  const map = {
    personalId: pickHeader(headers, HEADER_ALIASES.personalId),
    name: pickHeader(headers, HEADER_ALIASES.name),
    grade: pickHeader(headers, HEADER_ALIASES.grade),
    type: pickHeader(headers, HEADER_ALIASES.type),
    job: pickHeader(headers, HEADER_ALIASES.job),
  };

  for (const field of ['name', 'grade'] as const) {
    if (!map[field]) errors.push({ row: 0, field, message: `${field} 컬럼을 찾을 수 없습니다.` });
  }
  if (!map.type && !map.job) {
    errors.push({ row: 0, field: 'type/job', message: '타입 또는 직업 컬럼 중 하나는 필요합니다.' });
  }

  const records: SailorImportRecord[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const personalId = map.personalId ? cleanCell(row[map.personalId]) : '';
    const name = map.name ? cleanCell(row[map.name]) : '';
    const grade = map.grade ? cleanCell(row[map.grade]) : '';
    const sailorType = map.type ? cleanCell(row[map.type]) : '';
    const job = map.job ? cleanCell(row[map.job]) : '';

    if (!name) errors.push({ row: rowNumber, field: 'name', message: '이름이 비어 있습니다.' });
    if (!grade) errors.push({ row: rowNumber, field: 'grade', message: '등급이 비어 있습니다.' });
    if (!sailorType && !job) errors.push({ row: rowNumber, field: 'type/job', message: '타입 또는 직업이 필요합니다.' });

    const importKey = personalId || [name, grade, sailorType || job].join('|');
    if (seen.has(importKey)) {
      errors.push({ row: rowNumber, field: 'key', message: `중복 항해사 키입니다: ${importKey}` });
    }
    seen.add(importKey);

    if (name && grade && (sailorType || job)) {
      records.push({
        import_key: importKey,
        personal_id: personalId || null,
        name,
        grade,
        sailor_type: sailorType || null,
        job: job || null,
        payload: compactPayload(row),
      });
    }
  });

  return {
    kind: 'sailors',
    headers,
    unusedHeaders: findUnusedHeaders(headers, SAILOR_FIELDS.map(field => map[field])),
    rows,
    records,
    errors,
  };
}

function parseSeasonPrices(headers: string[], rows: Record<string, string>[], errors: ImportIssue[]): ParsedImport {
  const map = {
    city: pickHeader(headers, HEADER_ALIASES.city),
    itemName: pickHeader(headers, HEADER_ALIASES.itemName),
    category: pickHeader(headers, HEADER_ALIASES.category),
    pandemic: pickHeader(headers, HEADER_ALIASES.pandemic),
    basePrice: pickHeader(headers, HEADER_ALIASES.basePrice),
    pandemicLow: pickHeader(headers, HEADER_ALIASES.pandemicLow),
    pandemicHigh: pickHeader(headers, HEADER_ALIASES.pandemicHigh),
    boostLow: pickHeader(headers, HEADER_ALIASES.boostLow),
    boostHigh: pickHeader(headers, HEADER_ALIASES.boostHigh),
  };

  for (const field of ['city', 'itemName'] as const) {
    if (!map[field]) errors.push({ row: 0, field, message: `${field} 컬럼을 찾을 수 없습니다.` });
  }
  for (const field of ['basePrice', 'pandemicLow', 'pandemicHigh', 'boostLow', 'boostHigh'] as const) {
    if (!map[field]) errors.push({ row: 0, field, message: `${field} 가격 컬럼을 찾을 수 없습니다.` });
  }

  const records: SeasonPriceImportRecord[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const city = map.city ? cleanCell(row[map.city]) : '';
    const itemName = map.itemName ? cleanCell(row[map.itemName]) : '';
    const category = map.category ? cleanCell(row[map.category]) : '';
    const pandemic = map.pandemic ? cleanCell(row[map.pandemic]) : '';
    const basePrice = map.basePrice ? toNumber(cleanCell(row[map.basePrice])) : null;
    const pandemicLow = map.pandemicLow ? toNumber(cleanCell(row[map.pandemicLow])) : null;
    const pandemicHigh = map.pandemicHigh ? toNumber(cleanCell(row[map.pandemicHigh])) : null;
    const boostLow = map.boostLow ? toNumber(cleanCell(row[map.boostLow])) : null;
    const boostHigh = map.boostHigh ? toNumber(cleanCell(row[map.boostHigh])) : null;

    if (!city) errors.push({ row: rowNumber, field: 'city', message: '도시가 비어 있습니다.' });
    if (!itemName) errors.push({ row: rowNumber, field: 'itemName', message: '품목명이 비어 있습니다.' });

    const numericFields = { basePrice, pandemicLow, pandemicHigh, boostLow, boostHigh };
    for (const [field, value] of Object.entries(numericFields)) {
      if (value == null) errors.push({ row: rowNumber, field, message: `${field} 값이 비어 있거나 숫자가 아닙니다.` });
    }

    const importKey = `${city}|${itemName}`;
    if (seen.has(importKey)) {
      errors.push({ row: rowNumber, field: 'key', message: `중복 시즌 가격 키입니다: ${importKey}` });
    }
    seen.add(importKey);

    if (city && itemName && Object.values(numericFields).every(value => value != null)) {
      records.push({
        import_key: importKey,
        city,
        item_name: itemName,
        category: category || null,
        pandemic: pandemic || null,
        base_price: basePrice,
        pandemic_low: pandemicLow,
        pandemic_high: pandemicHigh,
        boost_low: boostLow,
        boost_high: boostHigh,
        payload: compactPayload(row),
      });
    }
  });

  return {
    kind: 'season_prices',
    headers,
    unusedHeaders: findUnusedHeaders(headers, SEASON_FIELDS.map(field => map[field])),
    rows,
    records,
    errors,
  };
}
