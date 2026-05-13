import { createHash, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

/**
 * .env 의 ADMIN_PASSWORD 를 sha256 해시로 환산. 미설정 시 null.
 * 초기 시드용 fallback. DB row 가 생기면 그쪽이 우선.
 * trim() — .env.local 줄바꿈/공백 잔여 방어.
 */
export function envPasswordHash(): string | null {
  const pw = (process.env.ADMIN_PASSWORD ?? '').trim();
  return pw ? sha256Hex(pw) : null;
}

/**
 * admin_settings 테이블의 단일 row 에 저장된 password_hash 반환.
 * 테이블이 없거나 row 가 없으면 null.
 */
export async function getStoredPasswordHash(): Promise<string | null> {
  try {
    const result = await withTimeout(
      supabaseAdmin
        .from('admin_settings')
        .select('password_hash')
        .eq('id', 1)
        .maybeSingle(),
      1500
    ) as { data: { password_hash?: string } | null; error: { message?: string } | null };
    const { data, error } = result;
    if (error) return null;
    return (data?.password_hash as string | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * DB row 에 비밀번호 해시 저장 (upsert).
 */
export async function setStoredPasswordHash(newHash: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('admin_settings')
      .upsert(
        { id: 1, password_hash: newHash, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    return !error;
  } catch {
    return false;
  }
}

/**
 * 효력 있는 비밀번호 해시. 우선순위: DB > env.
 * 둘 다 없으면 null (게이트 잠금).
 */
export async function getEffectivePasswordHash(): Promise<string | null> {
  const dbHash = await getStoredPasswordHash();
  if (dbHash) return dbHash;
  return envPasswordHash();
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const expected = await getEffectivePasswordHash();
  if (!expected) return false;
  const got = (await cookies()).get(ADMIN_COOKIE)?.value ?? '';
  return timingSafeEqualHex(got, expected);
}
