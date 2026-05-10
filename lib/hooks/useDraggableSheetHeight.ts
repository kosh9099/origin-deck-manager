'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'mobileSheetHeightVh.v1';
const DEFAULT_VH = 30;
const MIN_VH = 15;
const MAX_VH = 90;

/**
 * 모바일 바텀시트 높이를 드래그로 조절 + localStorage 저장.
 * 드래그 중에는 React state 우회 — DOM style 직접 수정으로 jank 방지.
 * pointerup 에서만 한 번 state commit (저장용).
 */
export function useDraggableSheetHeight() {
  const [heightVh, setHeightVh] = useState<number>(DEFAULT_VH);
  // 드래그 중 임시 높이를 보관하는 ref (state 안 거치고 DOM 으로 바로 반영)
  const liveVhRef = useRef<number>(DEFAULT_VH);
  // 패널 element 참조 — 드래그 중 직접 style.height 변경
  const sheetElRef = useRef<HTMLElement | null>(null);

  // hydrate from localStorage (한 번만)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= MIN_VH && n <= MAX_VH) {
          setHeightVh(n);
          liveVhRef.current = n;
        }
      }
    } catch { /* ignore */ }
  }, []);

  // 핸들 ref — 마운트 시 한 번만 핸들러 등록
  const setHandleRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;

    // 가장 가까운 aside (= sheet) 캐싱
    const findSheet = () => {
      sheetElRef.current = el.closest('aside');
    };
    findSheet();

    let dragging = false;
    let startY = 0;
    let startVh = DEFAULT_VH;
    let activePointerId = -1;
    let rafId: number | null = null;
    let pendingVh = liveVhRef.current;

    const flush = () => {
      rafId = null;
      const sheet = sheetElRef.current;
      if (sheet) sheet.style.height = `${pendingVh}vh`;
    };

    const onPointerDown = (e: PointerEvent) => {
      findSheet();
      dragging = true;
      startY = e.clientY;
      startVh = liveVhRef.current;
      activePointerId = e.pointerId;
      el.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== activePointerId) return;
      const dy = startY - e.clientY;
      const vh = window.innerHeight;
      const deltaVh = (dy / vh) * 100;
      const next = Math.min(MAX_VH, Math.max(MIN_VH, startVh + deltaVh));
      pendingVh = next;
      liveVhRef.current = next;
      // rAF 로 묶어서 한 프레임에 한 번만 DOM 업데이트
      if (rafId == null) rafId = requestAnimationFrame(flush);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== activePointerId) return;
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      // 마지막 한 번 DOM 동기화
      const sheet = sheetElRef.current;
      if (sheet) sheet.style.height = `${liveVhRef.current}vh`;
      // React state + localStorage 한 번만 commit
      setHeightVh(liveVhRef.current);
      try {
        window.localStorage.setItem(STORAGE_KEY, String(Math.round(liveVhRef.current)));
      } catch { /* ignore */ }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
  }, []);

  return { heightVh, setHandleRef };
}
