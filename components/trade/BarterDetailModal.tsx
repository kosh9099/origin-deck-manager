'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadCards, saveCards, loadRates, loadTicks, bumpFreq } from '@/lib/barter/storage';
import type { CartCard } from '@/types/barter';

export const BARTER_CARDS_UPDATED_EVENT = 'barter:cardsUpdated';

// BarterNode 타입만 정의 (로직은 서버 API에서 실행)
interface BarterNode {
    name: string;
    type: 'barter' | 'trade' | 'hybrid';
    status?: '▲' | '—' | '▼';
    bestCities?: string[];
    children?: BarterNode[];
}

interface Props {
    itemName: string;
    month: number;
    onClose: () => void;
}

const RenderNode = ({ node, depth }: { node: BarterNode; depth: number }) => {
    const hasChildren = !!node.children && node.children.length > 0;
    const hasTradeInfo = node.status && node.bestCities && node.bestCities.length > 0;

    return (
        <div className={`${depth > 0 ? 'ml-4 border-l border-slate-200 pl-3' : ''} my-1.5`}>
            <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[14px] shrink-0 leading-5">
                    {hasChildren ? '📦' : depth > 0 ? 'ㄴ' : '🔹'}
                </span>
                <span className={`text-sm leading-5 shrink-0 ${hasChildren ? 'font-black text-slate-800' : 'text-slate-700 font-semibold'}`}>
                    {node.name}
                </span>
                {hasTradeInfo && (
                    <>
                        <span
                            className={`text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 leading-5 ${
                                node.status === '▲'
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : node.status === '▼'
                                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                                      : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                        >
                            {node.status} {node.status === '▲' ? '성수기' : node.status === '▼' ? '비수기' : '평수기'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium leading-5 break-keep">
                            {node.bestCities?.join(', ')}
                        </span>
                    </>
                )}
            </div>

            {hasChildren && (
                <div className="mt-1">
                    {node.children!.map((child, idx) => (
                        <RenderNode key={`${child.name}-${idx}`} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function BarterDetailModal({ itemName, month, onClose }: Props) {
    const [tree, setTree] = useState<BarterNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [added, setAdded] = useState(false);

    const canAddToCart = !!tree && (tree.type === 'barter' || tree.type === 'hybrid');

    const handleAddToCart = () => {
        const cards = loadCards();
        const ticks = loadTicks()[itemName] ?? 0;
        const rates = JSON.parse(JSON.stringify(loadRates()));
        const newCard: CartCard = {
            id: Math.random().toString(36).slice(2, 10),
            name: itemName,
            ticks,
            rates,
        };
        saveCards([...cards, newCard]);
        bumpFreq(itemName);
        window.dispatchEvent(new CustomEvent(BARTER_CARDS_UPDATED_EVENT));
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        fetch('/api/barter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemName, month }),
        })
            .then(res => res.json())
            .then(data => {
                setTree(data.tree);
                setLoading(false);
            })
            .catch(err => {
                console.error('API 호출 실패:', err);
                setLoading(false);
            });
    }, [itemName, month]);

    if (!mounted || loading || !tree) return null;

    const modal = (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <span className="text-xl">📦</span> [{itemName}] 정보
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        ✕
                    </button>
                </div>

                <div className="px-6 py-4 overflow-y-auto bg-slate-50/30 flex-1 min-h-0">
                    <div className="mb-4 text-[11px] text-slate-400 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        💡 📦 아이콘은 물물 교환, 배지는 항구 구매 가능을 의미합니다.
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                        <RenderNode node={tree} depth={0} />
                    </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center gap-2 shrink-0">
                    {canAddToCart && (
                        <button
                            onClick={handleAddToCart}
                            disabled={added}
                            className={`px-6 py-2 rounded-xl font-bold transition-all shadow-lg ${
                                added
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                            }`}
                        >
                            {added ? '✓ 담겼습니다' : '🛒 장바구니 담기'}
                        </button>
                    )}
                    <button onClick={onClose} className="px-10 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg">
                        확인
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
