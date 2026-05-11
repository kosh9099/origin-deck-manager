'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Upload, RefreshCw, Eye, EyeOff, Eraser, Paintbrush } from 'lucide-react';
import townCoordsRaw from '@/constants/townCoords.json';
import villageCoordsRaw from '@/constants/villageCoords.json';
import townLabelsRaw from '@/constants/townLabels.json';
import villageLabelsRaw from '@/constants/villageLabels.json';

const MAP_NATURAL_WIDTH = 9972;
const MAP_NATURAL_HEIGHT = 5886;
const GRID_W = 1200;
const GRID_H = 708;
const CELL_W = MAP_NATURAL_WIDTH / GRID_W;
const CELL_H = MAP_NATURAL_HEIGHT / GRID_H;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 4;
const WHEEL_ZOOM_FACTOR = 1.15;
const TOWN_OFFSET_X = 30, TOWN_OFFSET_Y = 20;
const VILLAGE_OFFSET_X = -30, VILLAGE_OFFSET_Y = 20;

const STORAGE_KEY = 'seaMaskDraft.v1';

type Town = { id: string; x: number; y: number; s: number };
type Village = { id: string; x: number; y: number };

const TOWNS: Town[] = (townCoordsRaw as { towns?: Town[] } | null)?.towns ?? [];
const VILLAGES: Village[] = (villageCoordsRaw as { villages?: Village[] } | null)?.villages ?? [];
const TOWN_LABELS: Record<string, string> = townLabelsRaw as Record<string, string>;
const VILLAGE_LABELS: Record<string, string> = villageLabelsRaw as Record<string, string>;

type BrushSize = 1 | 3 | 5 | 9;
type Mode = 'sea' | 'land';

export default function SeaMaskEditor() {
  const [mask, setMask] = useState<Uint8Array | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [overlayOn, setOverlayOn] = useState(true);
  const [mode, setMode] = useState<Mode>('sea');
  const [brush, setBrush] = useState<BrushSize>(3);
  const [problemTowns, setProblemTowns] = useState<string[]>([]);
  const [problemVillages, setProblemVillages] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.2);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  // 컨테이너 크기 측정
  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    const measure = () => {
      const rect = c.getBoundingClientRect();
      setViewport({ w: rect.width, h: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || viewport.w === 0) return;
    initRef.current = true;
    const fitZoom = Math.max(MIN_ZOOM, viewport.w / MAP_NATURAL_WIDTH);
    setZoom(fitZoom);
    setPan({ x: 0, y: (viewport.h - MAP_NATURAL_HEIGHT * fitZoom) / 2 });
  }, [viewport.w, viewport.h]);

  // 마스크 로드 (서버 bin 우선, localStorage 초안 있으면 덮어씀)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/data/sea-mask.bin', { cache: 'no-store' });
        if (!res.ok) throw new Error('mask fetch failed');
        const buf = await res.arrayBuffer();
        let bits = new Uint8Array(buf);
        // localStorage draft 가 있으면 덮어씀
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const arr = new Uint8Array(JSON.parse(raw));
            if (arr.length === bits.length) bits = arr;
          }
        } catch { /* ignore */ }
        setMask(bits);
      } catch (e) {
        console.error('[mask] load failed', e);
        // 빈 마스크
        setMask(new Uint8Array(Math.ceil(GRID_W * GRID_H / 8)));
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // 마스크 변경 시 localStorage 자동 저장
  useEffect(() => {
    if (!hydrated || !mask) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(mask)));
    } catch { /* ignore */ }
  }, [mask, hydrated]);

  // 오버레이 canvas 그리기
  useEffect(() => {
    if (!mask) return;
    const cv = overlayCanvasRef.current;
    if (!cv) return;
    cv.width = GRID_W;
    cv.height = GRID_H;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(GRID_W, GRID_H);
    const d = img.data;
    for (let i = 0; i < GRID_W * GRID_H; i++) {
      const isSea = ((mask[i >> 3] >> (i & 7)) & 1) === 1;
      const o = i * 4;
      if (isSea) {
        d[o] = 56; d[o + 1] = 189; d[o + 2] = 248; d[o + 3] = 90;
      } else {
        d[o + 3] = 0;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [mask]);

  // 셀 토글 헬퍼
  const paintCell = useCallback((cx: number, cy: number, makeSea: boolean) => {
    setMask((prev) => {
      if (!prev) return prev;
      const next = new Uint8Array(prev);
      const half = (brush - 1) / 2;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue;
          const i = y * GRID_W + x;
          const byteIdx = i >> 3, bitMask = 1 << (i & 7);
          if (makeSea) next[byteIdx] |= bitMask;
          else next[byteIdx] &= ~bitMask;
        }
      }
      return next;
    });
  }, [brush]);

  // 드래그 paint 상태
  const dragRef = useRef<{ active: boolean; paint: boolean; pan: boolean; startX: number; startY: number; panX: number; panY: number }>(
    { active: false, paint: false, pan: false, startX: 0, startY: 0, panX: 0, panY: 0 }
  );
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    const c = scrollRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // 우클릭 또는 Alt = pan
    const isPan = e.button === 2 || e.altKey;
    dragRef.current = {
      active: true,
      paint: !isPan,
      pan: isPan,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    if (!isPan) {
      const worldX = (mx - pan.x) / zoom;
      const worldY = (my - pan.y) / zoom;
      const cx = Math.floor(worldX / CELL_W);
      const cy = Math.floor(worldY / CELL_H);
      paintCell(cx, cy, mode === 'sea');
    }
  }, [pan, zoom, mode, paintCell]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current;
    if (!s.active) return;
    if (s.pan) {
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      setPan({ x: s.panX + dx, y: s.panY + dy });
      return;
    }
    if (s.paint) {
      const c = scrollRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = (mx - pan.x) / zoom;
      const worldY = (my - pan.y) / zoom;
      const cx = Math.floor(worldX / CELL_W);
      const cy = Math.floor(worldY / CELL_H);
      paintCell(cx, cy, mode === 'sea');
    }
  }, [pan, zoom, mode, paintCell]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const c = scrollRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    if (newZoom === zoom) return;
    const worldX = (mx - pan.x) / zoom;
    const worldY = (my - pan.y) / zoom;
    setPan({ x: mx - worldX * newZoom, y: my - worldY * newZoom });
    setZoom(newZoom);
  }, [zoom, pan]);

  // 검증 헬퍼
  const isSeaAt = useCallback((cx: number, cy: number): boolean => {
    if (!mask || cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) return false;
    const i = cy * GRID_W + cx;
    return ((mask[i >> 3] >> (i & 7)) & 1) === 1;
  }, [mask]);

  const validateTowns = useCallback(() => {
    const bad: string[] = [];
    for (const t of TOWNS) {
      const cx = Math.round((t.x + TOWN_OFFSET_X) / CELL_W);
      const cy = Math.round((t.y + TOWN_OFFSET_Y) / CELL_H);
      let ok = false;
      for (let dy = -3; dy <= 3 && !ok; dy++)
        for (let dx = -3; dx <= 3 && !ok; dx++)
          if (isSeaAt(cx + dx, cy + dy)) ok = true;
      if (!ok) bad.push(TOWN_LABELS[t.id] || t.id);
    }
    setProblemTowns(bad);
    setStatusMsg(`도시 ${TOWNS.length - bad.length}/${TOWNS.length} 정상. 문제 ${bad.length}건.`);
  }, [isSeaAt]);

  const validateVillages = useCallback(() => {
    const bad: string[] = [];
    for (const v of VILLAGES) {
      const cx = Math.round((v.x + VILLAGE_OFFSET_X) / CELL_W);
      const cy = Math.round((v.y + VILLAGE_OFFSET_Y) / CELL_H);
      let onLand = false;
      for (let dy = -1; dy <= 1 && !onLand; dy++)
        for (let dx = -1; dx <= 1 && !onLand; dx++)
          if (!isSeaAt(cx + dx, cy + dy)) onLand = true;
      if (!onLand) bad.push(VILLAGE_LABELS[v.id] || v.id);
    }
    setProblemVillages(bad);
    setStatusMsg(`마을 ${VILLAGES.length - bad.length}/${VILLAGES.length} 정상. 문제 ${bad.length}건.`);
  }, [isSeaAt]);

  const handleExport = useCallback(() => {
    if (!mask) return;
    const blob = new Blob([mask as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sea-mask.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMsg('sea-mask.bin 다운로드 완료. public/data/ 에 덮어쓰세요.');
  }, [mask]);

  const handleImportFile = useCallback((file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const buf = r.result as ArrayBuffer;
      const arr = new Uint8Array(buf);
      if (arr.length !== Math.ceil(GRID_W * GRID_H / 8)) {
        setStatusMsg(`bin 파일 크기 불일치: ${arr.length} (예상 ${Math.ceil(GRID_W * GRID_H / 8)})`);
        return;
      }
      setMask(arr);
      setStatusMsg('파일 불러오기 완료.');
    };
    r.readAsArrayBuffer(file);
  }, []);

  const handleResetServer = useCallback(async () => {
    if (!window.confirm('서버의 sea-mask.bin 으로 초기화할까요? 로컬 편집 내용이 사라집니다.')) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      const res = await fetch('/data/sea-mask.bin', { cache: 'no-store' });
      const buf = await res.arrayBuffer();
      setMask(new Uint8Array(buf));
      setStatusMsg('서버 마스크로 초기화됨.');
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 도시/마을 문제 셋
  const problemTownSet = useMemo(() => new Set(problemTowns), [problemTowns]);
  const problemVillageSet = useMemo(() => new Set(problemVillages), [problemVillages]);

  return (
    <div className="min-h-screen bg-[#f0ece4]">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="px-3 md:px-5 py-2 flex flex-wrap items-center gap-2">
          <Link href="/admin"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-bold rounded-lg shadow-sm">
            <ArrowLeft size={13} /> 관리자
          </Link>
          <h1 className="text-[14px] font-black text-slate-800 mr-2">바다 마스크 편집기</h1>

          <div className="flex items-center gap-1 text-[11px]">
            <button onClick={() => setMode('sea')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded font-bold ${mode === 'sea' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
              <Paintbrush size={11} /> 바다
            </button>
            <button onClick={() => setMode('land')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded font-bold ${mode === 'land' ? 'bg-amber-700 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
              <Eraser size={11} /> 육지
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <span className="font-bold text-slate-500">브러시</span>
            {[1, 3, 5, 9].map((sz) => (
              <button key={sz} onClick={() => setBrush(sz as BrushSize)}
                className={`px-2 py-1 rounded font-bold ${brush === sz ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                {sz}×{sz}
              </button>
            ))}
          </div>

          <button onClick={() => setOverlayOn((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded">
            {overlayOn ? <Eye size={11} /> : <EyeOff size={11} />}
            오버레이
          </button>

          <div className="flex items-center gap-1 ml-auto">
            <button onClick={validateTowns}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-sm">
              도시 검증
            </button>
            <button onClick={validateVillages}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shadow-sm">
              마을 검증
            </button>
            <button onClick={handleResetServer}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded">
              <RefreshCw size={11} /> 서버
            </button>
            <button onClick={handleExport}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-lg shadow-sm">
              <Download size={13} /> 내보내기
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-[12px] font-bold rounded-lg shadow-sm">
              <Upload size={13} /> 불러오기
            </button>
            <input ref={fileInputRef} type="file" accept=".bin" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); if (e.target) e.target.value = ''; }} />
          </div>
        </div>
        {statusMsg && (
          <div className="px-3 md:px-5 pb-2 text-[12px] text-slate-700 font-bold">{statusMsg}</div>
        )}
      </div>

      {/* 본문 */}
      <div className="flex" style={{ height: 'calc(100vh - 50px)' }}>
        <div
          ref={scrollRef}
          className="flex-1 relative overflow-hidden bg-slate-200 select-none"
          style={{ cursor: isDragging ? (dragRef.current.pan ? 'grabbing' : 'crosshair') : 'crosshair', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            style={{
              position: 'absolute', top: 0, left: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
          >
            {/* 베이스 월드맵 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/maps/world-map.webp"
              alt="World map"
              draggable={false}
              style={{
                position: 'absolute', left: 0, top: 0,
                width: MAP_NATURAL_WIDTH, height: MAP_NATURAL_HEIGHT,
                maxWidth: 'none', userSelect: 'none', pointerEvents: 'none', display: 'block',
              }}
            />
            {/* 마스크 오버레이 */}
            {overlayOn && (
              <canvas
                ref={overlayCanvasRef}
                style={{
                  position: 'absolute', left: 0, top: 0,
                  width: MAP_NATURAL_WIDTH, height: MAP_NATURAL_HEIGHT,
                  imageRendering: 'pixelated',
                  pointerEvents: 'none',
                }}
              />
            )}
            {/* 도시 점 — 문제 도시는 적색 */}
            {TOWNS.map((t) => {
              const wx = t.x + TOWN_OFFSET_X;
              const wy = t.y + TOWN_OFFSET_Y;
              const label = TOWN_LABELS[t.id] || t.id;
              const bad = problemTownSet.has(label);
              return (
                <div key={t.id}
                  style={{
                    position: 'absolute', left: wx, top: wy,
                    transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                    transformOrigin: 'center',
                    pointerEvents: 'none', zIndex: bad ? 5 : 3,
                  }}>
                  <div className={`rounded-full border border-white/80 ${bad ? 'bg-rose-500 ring-2 ring-rose-300' : 'bg-emerald-500/80'}`}
                    style={{ width: bad ? 12 : 7, height: bad ? 12 : 7 }} />
                </div>
              );
            })}
            {/* 마을 점 */}
            {VILLAGES.map((v) => {
              const wx = v.x + VILLAGE_OFFSET_X;
              const wy = v.y + VILLAGE_OFFSET_Y;
              const label = VILLAGE_LABELS[v.id] || v.id;
              const bad = problemVillageSet.has(label);
              return (
                <div key={v.id}
                  style={{
                    position: 'absolute', left: wx, top: wy,
                    transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                    transformOrigin: 'center',
                    pointerEvents: 'none', zIndex: bad ? 5 : 3,
                  }}>
                  <div className={`rounded-sm border border-white/80 ${bad ? 'bg-rose-500 ring-2 ring-rose-300' : 'bg-amber-500/80'}`}
                    style={{ width: bad ? 12 : 7, height: bad ? 12 : 7 }} />
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-3 right-3 bg-white/90 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm pointer-events-none">
            {Math.round(zoom * 100)}%
          </div>
          <div className="absolute bottom-3 left-3 bg-white/90 border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm pointer-events-none">
            우클릭 또는 Alt+드래그 = 이동 · 좌클릭 = 칠하기 · 휠 = 줌
          </div>
        </div>
      </div>
    </div>
  );
}
