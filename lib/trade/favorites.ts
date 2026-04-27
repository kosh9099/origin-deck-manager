// 즐겨찾기된 이벤트 ID 목록을 localStorage에 영구 저장.
// 자동 생성 대유행 ID(autogen-...)는 시간 기반으로 deterministic하게 재생성되고
// 부양/급매 ID는 DB UUID이므로 새로고침 후에도 동일 이벤트는 동일 ID를 가짐.

const STORAGE_KEY = 'trade-favorites';

export function loadFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((v): v is string => typeof v === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export function saveFavorites(favs: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favs]));
  } catch {
    /* quota or privacy mode — silently ignore */
  }
}
