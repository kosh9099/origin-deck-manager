const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const CHO_SET = new Set(CHO);
const HANGUL_BASE = 0xAC00;
const HANGUL_LAST = 0xD7A3;
const CHO_DIVISOR = 21 * 28;

export function getChosung(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      out += CHO[Math.floor((code - HANGUL_BASE) / CHO_DIVISOR)];
    } else {
      out += ch;
    }
  }
  return out;
}

export function isAllChosung(s: string): boolean {
  if (!s) return false;
  for (const ch of s) {
    if (!CHO_SET.has(ch)) return false;
  }
  return true;
}

export function matchesQuery(name: string, query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  if (name.includes(q)) return true;
  if (isAllChosung(q)) return getChosung(name).includes(q);
  return false;
}
