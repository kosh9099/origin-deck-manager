'use client';

import React, { useEffect, useState } from 'react';

// 💡 BarterNode 타입만 정의 (로직은 서버 API에서 실행)
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

// 💡 RenderNode: 조합 정보와 시세 정보를 동시에 렌더링합니다.
const RenderNode = ({ node, depth }: { node: BarterNode; depth: number }) => {
    const hasChildren = node.children && node.children.length > 0;
    const hasTradeInfo = node.status && node.bestCities && node.bestCities.length > 0;

    return (
        <div className={`${depth > 0 ? 'ml-4 border-l border-slate-200 pl-3' : ''} my-1.5`}>
            <div className="flex items-center gap-2 flex-wrap">
                {/* 1. 아이콘: 조합 가능하면 📦, 단순 구매템이면 ㄴ 또는 🔹 */}
                <span className="text-[14px]">
                    {hasChildren ? '📦' : (depth > 0 ? 'ㄴ' : '🔹')}
                </span>

                {/* 2. 아이템 이름 */}
                <span className={`text-sm ${hasChildren ? 'font-black text-slate-800' : 'text-slate-600'}`}>
                    {node.name}
                </span>

                {/* 3. 💡 시세 정보 배지 */}
                {hasTradeInfo && (
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${node.status === '▲' ? 'bg-red-50 text-red-600 border-red-100' :
                            node.status === '▼' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-slate-50 text-slate-500 border-slate-100'
                            }`}>
                            {node.status} {node.status === '▲' ? '성수기' : node.status === '▼' ? '비수기' : '평수기'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                            {node.bestCities?.join(', ')}
                        </span>
                    </div>
                )}
            </div>

            {/* 4. 재귀적으로 자식들을 렌더링 (재료 리스트) */}
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

    useEffect(() => {
        // 💡 서버 API를 호출하여 트리 데이터를 가져옴 (로직 비공개)
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
                console.error("API 호출 실패:", err);
                setLoading(false);
            });
    }, [itemName, month]);

    if (loading || !tree) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <span className="text-xl">📦</span> [{itemName}] 정보
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">✕</button>
                </div>

                <div className="p-6 max-h-[65vh] overflow-y-auto bg-slate-50/30">
                    <div className="mb-4 text-[11px] text-slate-400 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        💡 📦 아이콘은 물물 교환, 배지는 항구 구매 가능을 의미합니다.
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                        <RenderNode node={tree} depth={0} />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 flex justify-center">
                    <button onClick={onClose} className="px-10 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg">
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}