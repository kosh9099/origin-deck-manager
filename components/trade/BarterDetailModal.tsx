'use client';

import React, { useEffect, useState } from 'react';
import { buildBarterTree, BarterNode } from '@/lib/trade/barterEngine';
import { initBarterSystem } from '@/lib/trade/barterLoader';

interface Props {
    itemName: string;
    month: number;
    onClose: () => void;
}

// 💡 1. 에러의 원인이었던 RenderNode 함수를 여기에 정의합니다.
const RenderNode = ({ node, depth }: { node: BarterNode; depth: number }) => {
    return (
        <div className={`${depth > 0 ? 'ml-4 border-l border-slate-200 pl-3' : ''} my-1.5`}>
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm ${node.type === 'barter' ? 'font-black text-slate-800' : 'text-slate-600'}`}>
                    {depth > 0 && 'ㄴ'} {node.name}
                </span>

                {node.type === 'trade' && (
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${node.status === '▲' ? 'bg-red-50 text-red-600 border-red-100' :
                            node.status === '▼' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                            }`}>
                            {node.status} {node.status === '▲' ? '성수기' : node.status === '▼' ? '비수기' : '평수기'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                            {node.bestCities?.join(', ')}
                        </span>
                    </div>
                )}
            </div>

            {/* 재귀적으로 자식들을 렌더링 */}
            {node.children?.map((child, idx) => (
                <RenderNode key={`${child.name}-${idx}`} node={child} depth={depth + 1} />
            ))}
        </div>
    );
};

// 💡 2. 메인 모달 컴포넌트
export default function BarterDetailModal({ itemName, month, onClose }: Props) {
    const [allData, setAllData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // CSV 시스템 초기화 및 데이터 로드
        initBarterSystem().then((res) => {
            setAllData(res);
            setLoading(false);
        }).catch(err => {
            console.error("CSV 로드 실패:", err);
            setLoading(false);
        });
    }, []);

    if (loading || !allData) return null;

    // 엔진을 통해 트리 생성
    const tree = buildBarterTree(itemName, month, allData);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <span className="text-xl">📦</span> [{itemName}] 재료 조합 정보
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">✕</button>
                </div>

                <div className="p-6 max-h-[65vh] overflow-y-auto bg-slate-50/30">
                    <div className="mb-4 text-[11px] text-slate-400 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        💡 인게임 <span className="font-bold text-slate-600">{month}월</span> 기준으로 **가장 유리한 도시**만 필터링되었습니다.
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                        {/* 💡 정의된 RenderNode를 여기서 호출합니다. */}
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