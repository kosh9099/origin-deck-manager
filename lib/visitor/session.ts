'use client';

const STORAGE_KEY = 'visitor_session_id';

/**
 * 브라우저당 1개의 익명 세션 UUID 생성/조회.
 * localStorage 에 영구 저장 — 같은 브라우저는 항상 동일 ID.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return '';
  }
}
