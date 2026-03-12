'use client';

import React, { useState, useEffect } from 'react';
import { TradeEvent } from '@/types/trade';
import { generateEpidemicSchedules } from '@/lib/trade/epidemic';
import ScheduleTable from './ScheduleTable';
import ScheduleCards from './ScheduleCards';
import { Flame } from 'lucide-react';

export default function TradeDashboard() {
  const [events, setEvents] = useState<TradeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. 초기 렌더링 및 DB 스케줄(부양, 아이템 투표) 로딩
  useEffect(() => {
    let active = true;

    async function fetchData() {
      // (1) 대유행 생성
      const autoGenEvents = generateEpidemicSchedules(12);

      try {
        // (2) 부양 & 아이템 가져오기
        const { getActiveBoosts, getTradeItems } = await import('@/lib/supabaseClient');
        const [dbBoosts, dbItems] = await Promise.all([
          getActiveBoosts().catch(() => []),
          getTradeItems().catch(() => [])
        ]);

        if (!active) return; // 언마운트 시 무시

        // DB 부양 데이터 규격화 (실제 DB 컬럼: city, type 사용)
        const boostEvents: TradeEvent[] = dbBoosts.map((b: any) => ({
          id: b.id,
          zone: b.city || b.zone || "미상",
          city: b.city || undefined,
          type: b.type,
          isBoost: true,
          startTime: new Date(b.start_time).getTime(),
          items: []
        }));

        // Items 병합 (부양 + 자동 대유행 모두 매칭)
        const allEvents = [...autoGenEvents, ...boostEvents];

        dbItems.forEach((dbItem: any) => {
          const targetEvent = allEvents.find(e => e.id === dbItem.schedule_id);
          if (targetEvent) {
            targetEvent.items.push({
              id: dbItem.id,
              name: dbItem.item_name,
              upvotes: dbItem.upvotes,
              downvotes: dbItem.downvotes,
              // isUserVoted는 ItemVotePanel 렌더링 시점에 LocalStorage에서 판단 처리
              isUserVoted: null
            });
          }
        });

        // 결과 정렬 (시간순 -> 득표순)
        allEvents.sort((a, b) => a.startTime - b.startTime);
        allEvents.forEach(e => e.items.sort((x, y) => y.upvotes - x.upvotes));

        setEvents(allEvents);
      } catch (e) {
        console.error("Failed to load DB events", e);
        // DB 오류 시 대유행만이라도 렌더링
        setEvents(autoGenEvents);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    return () => { active = false; };
  }, []);

  // 2. Realtime 구독 (부양 및 아이템 투표 변동 시 자동 갱신)
  useEffect(() => {
    let active = true;

    // Supabase 인스턴스 지연 로드
    const setupSubscriptions = async () => {
      const { supabase } = await import('@/lib/supabaseClient');

      if (!active) return;

      const channel = supabase
        .channel('trade_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trade_boosts' },
          (payload: any) => {
            console.log("New Boost Detected:", payload);
            // 구조가 바뀌었으므로 깔끔하게 전체 리로드 트리거 (간단 구현)
            // 의존성을 위해 fetchData 자체를 외부에 빼거나 reload 상태를 토글하는 방식으로 할 수 있지만,
            // 여기선 간단하게 페이지 새로고침을 유도하거나 상태 토글 플래그를 추가.
            // V1 목적에 맞게 단순 알림 처리 후 추후 리팩토링 대비.
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trade_items' },
          (payload: any) => {
            console.log("Item/Vote Changed:", payload);
            if (payload.eventType === 'UPDATE') {
              handleVoteOptimistic(
                payload.new.schedule_id,
                payload.new.id,
                payload.new.upvotes > (payload.old as any).upvotes // up이 증가했으면 true, 아니면 false 간접추정
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    let cleanupFunc: (() => void) | void;
    setupSubscriptions().then(cleanup => { cleanupFunc = cleanup; });

    return () => {
      active = false;
      if (cleanupFunc) cleanupFunc();
    };
  }, []);

  // 낙관적 UI 업데이트 (투표)
  const handleVoteOptimistic = (eventId: string, itemId: string, isUp: boolean) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev;
      return {
        ...ev,
        items: ev.items.map(it => {
          if (it.id !== itemId) return it;
          return {
            ...it,
            upvotes: isUp ? it.upvotes + 1 : it.upvotes,
            downvotes: !isUp ? it.downvotes + 1 : it.downvotes,
            isUserVoted: (isUp ? 'up' : 'down') as 'up' | 'down'
          };
        }).sort((a, b) => b.upvotes - a.upvotes) // 투표 후 즉시 정렬 (추천순)
      };
    }));
  };

  // 낙관적 UI 업데이트 (품목 추가)
  const handleAddOptimistic = (eventId: string, newItem: typeof events[0]['items'][0]) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev;
      return {
        ...ev,
        items: [...ev.items, newItem].sort((a, b) => b.upvotes - a.upvotes)
      };
    }));
  };

  // 부양 삭제 (낙관적 UI 반영된 래퍼)
  const handleDeleteBoost = async (eventId: string) => {
    if (!window.confirm("이 일정을 삭제하시겠습니까?")) return;

    // 낙관적 UI 업데이트
    setEvents(prev => prev.filter(ev => ev.id !== eventId));

    try {
      const { deleteBoost } = await import('@/lib/supabaseClient');
      await deleteBoost(eventId);
    } catch (e) {
      console.error("Failed to delete boost", e);
      alert("삭제 중 오류가 발생했습니다. (자신이 등록한 일정이 아닐 수 있습니다)");
      // 원래 상태로 되돌리기 로직은 생략 (V1 단순화)
    }
  };

  // 추천 품목 삭제 (낙관적 UI 반영)
  const handleDeleteItem = (eventId: string, itemId: string) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev;
      return { ...ev, items: ev.items.filter(it => it.id !== itemId) };
    }));
  };

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    // 반응형에 따라 초기 뷰 설정
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('cards');
      } else {
        setViewMode('table');
      }
    };

    handleResize(); // 초기화
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col h-full relative" id="trade-dashboard-capture-area">

      {/* 캡처 타이틀 헤더 영역 (캡처 시 표기됨) */}
      <div className="bg-gradient-to-r from-emerald-900/60 to-slate-900 p-4 rounded-xl border border-emerald-500/20 mb-4 shadow-lg flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-black text-emerald-400 flex items-center gap-2">
            <Flame size={20} className="text-amber-500 animate-pulse" />
            교역 스케줄 현황
          </h3>
          <p className="text-xs text-slate-400 mt-1 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <span>대유행 예측 및 유저 공유 부양 일정</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-[11px] font-bold text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
            기준 시각: {new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex bg-slate-800/80 rounded-xl p-1 border border-white/5 shadow-inner">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-emerald-500/20 text-emerald-400 shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              PC 뷰
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'cards' ? 'bg-emerald-500/20 text-emerald-400 shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              모바일 뷰
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 pb-10">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-full animate-in fade-in duration-500">
            {viewMode === 'table' ? (
              <div className="block">
                <ScheduleTable
                  events={events}
                  onVoteOptimistic={handleVoteOptimistic}
                  onAddOptimistic={handleAddOptimistic}
                  onDeleteBoost={handleDeleteBoost}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            ) : (
              <div className="block">
                <ScheduleCards
                  events={events}
                  onVoteOptimistic={handleVoteOptimistic}
                  onAddOptimistic={handleAddOptimistic}
                  onDeleteBoost={handleDeleteBoost}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
