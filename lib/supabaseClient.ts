import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 싱글톤 인스턴스
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(supabaseUrl, supabaseKey) as any;

// --- [교역 (Trade) 전용 모듈] ---

/**
 * 모든 활성화된 부양 스케줄을 가져옵니다 (과거 데이터 제외, 최근 36시간)
 */
export async function getActiveBoosts() {
  const cutoffTime = new Date(Date.now() - (60 * 60 * 1000)).toISOString(); // 1시간 전까지는 허용
  
  const { data, error } = await supabase
    .from('trade_boosts')
    .select('*')
    .gte('start_time', cutoffTime)
    .order('start_time', { ascending: true });

  if (error) {
    console.error("Error fetching boosts:", error);
    return [];
  }
  return data;
}

/**
 * 모든 아이템 추천과 투표 정보를 가져옵니다
 */
export async function getTradeItems() {
  const { data, error } = await supabase
    .from('trade_items')
    .select('*');
    
  if (error) {
    console.error("Error fetching items:", error);
    return [];
  }
  return data;
}

/**
 * 새로운 부양 스케줄을 등록합니다
 */
export async function insertBoost(port_name: string, category: string, start_time: string) {
  const { data, error } = await supabase
    .from('trade_boosts')
    // We map UI concepts port_name -> city, category -> type for backward compat.
    // The user's remote DB expects 'city' and 'type' and we cannot run raw ALTER TABLE.
    .insert([{ city: port_name, type: category, start_time, zone: port_name }])
    .select();
    
  if (error) throw error;
  return data[0];
}

/**
 * 등록된 부양 스케줄의 도시/이벤트를 수정합니다.
 */
export async function updateBoost(boostId: string, updates: { port_name?: string; category?: string }) {
  const patch: Record<string, string> = {};
  if (updates.port_name !== undefined) {
    patch.city = updates.port_name;
    patch.zone = updates.port_name;
  }
  if (updates.category !== undefined) {
    patch.type = updates.category;
  }
  const { data, error } = await supabase
    .from('trade_boosts')
    .update(patch)
    .eq('id', boostId)
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * 등록된 부양 스케줄을 삭제합니다.
 */
export async function deleteBoost(boostId: string) {
  const { error } = await supabase
    .from('trade_boosts')
    .delete()
    .eq('id', boostId);
    
  if (error) throw error;
  return true;
}

/**
 * 특정 스케줄에 새로운 품목을 추천합니다
 */
export async function insertTradeItem(schedule_id: string, item_name: string): Promise<{ id: string; item_name: string; upvotes: number; downvotes: number }> {
  const { data, error } = await supabase
    .from('trade_items')
    .insert([{ schedule_id, item_name, upvotes: 1, downvotes: 0 }])
    .select();
    
  if (error) throw error;
  return data[0] as { id: string; item_name: string; upvotes: number; downvotes: number };
}

/**
 * 추천 품목을 삭제합니다.
 */
export async function deleteTradeItem(itemId: string) {
  const { error } = await supabase
    .from('trade_items')
    .delete()
    .eq('id', itemId);
    
  if (error) throw error;
  return true;
}

/**
 * 특정 품목표에 투표합니다 (Up/Down)
 */
export async function voteTradeItem(item_id: string, isUpvote: boolean) {
  // 실제 서비스에서는 RPC 등을 활용해 원자적(Atomic) 업데이트를 하는 것이 안전하지만, V1이므로 수동 갱신 사용 가능. (Supabase function 권장)
  // 편의상 이 예제에서는 기존 값을 불어와서 +1 업데이트 수행.
  
  const { data: itemData } = await supabase
    .from('trade_items')
    .select('upvotes, downvotes')
    .eq('id', item_id)
    .single();
    
  if (!itemData) return null;

  const updates = isUpvote 
    ? { upvotes: itemData.upvotes + 1 }
    : { downvotes: itemData.downvotes + 1 };

  const { data, error } = await supabase
    .from('trade_items')
    .update(updates)
    .eq('id', item_id)
    .select();
    
  if (error) throw error;
  return data[0];
}
