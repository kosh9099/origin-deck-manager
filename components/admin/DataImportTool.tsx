'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Database, FileSpreadsheet, Loader2, RefreshCw, Upload } from 'lucide-react';

type ImportKind = 'sailors' | 'season_prices';

type PreviewResult = {
  ok: boolean;
  kind: ImportKind;
  rowCount: number;
  validCount: number;
  errorCount: number;
  headers: string[];
  unusedHeaders: string[];
  summary: {
    added: number;
    updated: number;
    unchanged: number;
    errors: number;
  };
  warning?: string | null;
  errors: Array<{ row: number; field?: string; message: string }>;
  sample: Array<Record<string, unknown>>;
  detail?: string;
};

type ImportBatch = {
  id: string;
  kind: ImportKind;
  status: string;
  row_count: number;
  valid_count: number;
  result: Record<string, unknown> | null;
  created_at: string;
};

const KIND_OPTIONS: Array<{ value: ImportKind; label: string; hint: string }> = [
  { value: 'sailors', label: '항해사 DB', hint: '이름, 등급, 타입 또는 직업이 필요합니다.' },
  { value: 'season_prices', label: '시즌 단가표', hint: '도시, 품목명, 기본가, 대유행/부스트 가격이 필요합니다.' },
];

export default function DataImportTool() {
  const [kind, setKind] = useState<ImportKind>('sailors');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const selectedKind = useMemo(() => KIND_OPTIONS.find(option => option.value === kind)!, [kind]);
  const canApply = !!preview?.ok && preview.errorCount === 0 && preview.validCount > 0;

  useEffect(() => {
    void loadBatches();
  }, []);

  useEffect(() => {
    if (!preview) return;
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [preview]);

  const loadBatches = async () => {
    const res = await fetch('/api/admin/import/batches', { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ok) setBatches(body.batches ?? []);
  };

  const runPreview = async () => {
    setLoadingPreview(true);
    setMessage(null);
    setPreview(null);
    try {
      const res = await fetch('/api/admin/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, text }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setMessage({ type: 'err', text: body.detail ?? '미리보기에 실패했습니다.' });
        return;
      }
      setPreview(body);
      setMessage({
        type: body.errorCount > 0 ? 'err' : 'ok',
        text: body.errorCount > 0 ? '검증 오류를 확인해 주세요.' : '미리보기가 준비되었습니다.',
      });
    } catch {
      setMessage({ type: 'err', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const applyImport = async () => {
    setLoadingApply(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/import/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, text }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setMessage({ type: 'err', text: body.detail ?? body.error ?? '적용에 실패했습니다.' });
        return;
      }
      setMessage({ type: 'ok', text: `${body.affected}건을 Supabase에 반영했습니다.` });
      await loadBatches();
      await runPreview();
    } catch {
      setMessage({ type: 'err', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setLoadingApply(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0ece4] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-bold rounded-lg shadow-sm transition-all">
            <ArrowLeft size={13} /> 관리자
          </Link>
          <button
            onClick={loadBatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white text-[12px] font-bold rounded-lg shadow-sm transition-all"
          >
            <RefreshCw size={13} /> 이력 새로고침
          </button>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">데이터 가져오기</h1>
              <p className="text-[12px] text-slate-500 mt-1">엑셀이나 구글시트에서 헤더 포함 표를 복사해 붙여넣고 Supabase 조회용 테이블에 병합합니다.</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {KIND_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setKind(option.value);
                    setPreview(null);
                    setMessage(null);
                  }}
                  className={`text-left rounded-xl border p-4 transition-all ${kind === option.value ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="font-black text-[14px] text-slate-800">{option.label}</div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{option.hint}</div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[12px] font-black text-slate-700">{selectedKind.label} 붙여넣기</label>
                <span className="text-[11px] font-bold text-slate-400">TSV/CSV 자동 인식</span>
              </div>
              <textarea
                value={text}
                onChange={event => {
                  setText(event.target.value);
                  setPreview(null);
                  setMessage(null);
                }}
                placeholder="첫 줄은 헤더여야 합니다. 엑셀에서 표를 복사한 뒤 여기에 붙여넣으세요."
                className="w-full min-h-[320px] resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-[12px] leading-relaxed text-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {message && (
              <p className={`text-[12px] font-bold flex items-center gap-1 ${message.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                {message.type === 'ok' && <Check size={13} />}
                {message.text}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={runPreview}
                disabled={loadingPreview || text.trim().length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white font-black rounded-xl text-[13px] transition-all shadow-sm disabled:opacity-50"
              >
                {loadingPreview ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                검증 및 미리보기
              </button>
              <button
                onClick={applyImport}
                disabled={loadingApply || !canApply}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[13px] transition-all shadow-sm disabled:opacity-50"
              >
                {loadingApply ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Supabase에 적용
              </button>
            </div>

            <div ref={previewRef}>
              {preview ? (
                <PreviewPanel preview={preview} />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-[12px] font-bold text-slate-500">
                  미리보기 결과가 여기에 표시됩니다. 표를 붙여넣고 검증 및 미리보기를 누르세요.
                </div>
              )}
            </div>
          </section>

          <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-fit">
            <h2 className="font-black text-slate-800 text-[14px]">미리보기 상태</h2>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {loadingPreview ? (
                <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-600">
                  <Loader2 size={13} className="animate-spin" /> 검증 중입니다.
                </p>
              ) : preview ? (
                <div className="space-y-1 text-[12px]">
                  <p className="font-black text-slate-800">{preview.rowCount}행 중 {preview.validCount}행 인식</p>
                  <p className={preview.errorCount > 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>
                    오류 {preview.errorCount}건
                  </p>
                  <p className="text-slate-500">
                    신규 {preview.summary.added} · 수정 {preview.summary.updated} · 유지 {preview.summary.unchanged}
                  </p>
                </div>
              ) : (
                <p className="text-[12px] font-bold text-slate-500">아직 미리보기를 실행하지 않았습니다.</p>
              )}
            </div>

            <div className="h-px bg-slate-200 my-5" />

            <h2 className="font-black text-slate-800 text-[14px]">최근 가져오기</h2>
            <div className="mt-3 space-y-2">
              {batches.length === 0 ? (
                <p className="text-[12px] text-slate-500">아직 기록이 없습니다.</p>
              ) : (
                batches.map(batch => (
                  <div key={batch.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-black text-slate-700">{batch.kind === 'sailors' ? '항해사 DB' : '시즌 단가표'}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${batch.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {batch.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {batch.valid_count}/{batch.row_count}건 · {new Date(batch.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({ preview }: { preview: PreviewResult }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Metric label="전체 행" value={preview.rowCount} />
        <Metric label="신규" value={preview.summary.added} />
        <Metric label="수정" value={preview.summary.updated} />
        <Metric label="유지" value={preview.summary.unchanged} />
        <Metric label="오류" value={preview.summary.errors} tone={preview.summary.errors > 0 ? 'red' : 'slate'} />
      </div>

      {preview.unusedHeaders.length > 0 && (
        <div>
          <h3 className="text-[12px] font-black text-slate-700">미사용 컬럼</h3>
          <p className="text-[11px] text-slate-500 mt-1 break-words">{preview.unusedHeaders.join(', ')}</p>
        </div>
      )}

      {preview.warning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] font-bold text-amber-700">
          {preview.warning}
        </div>
      )}

      {preview.errors.length > 0 && (
        <div>
          <h3 className="text-[12px] font-black text-red-600">검증 오류</h3>
          <div className="mt-2 space-y-1">
            {preview.errors.map((error, index) => (
              <div key={`${error.row}-${error.field}-${index}`} className="text-[12px] text-red-600">
                {error.row > 0 ? `${error.row}행` : '헤더'} {error.field ? `(${error.field})` : ''}: {error.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {preview.sample.length > 0 && (
        <div>
          <h3 className="text-[12px] font-black text-slate-700">샘플</h3>
          <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-white border border-slate-200 p-3 text-[11px] text-slate-700">
            {JSON.stringify(preview.sample, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'red' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-black text-slate-400 uppercase">{label}</div>
      <div className={`text-xl font-black mt-1 ${tone === 'red' ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
