import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  envPasswordHash,
  getStoredPasswordHash,
  setStoredPasswordHash,
  sha256Hex,
  timingSafeEqualHex,
} from '@/lib/admin/auth';

export async function POST(req: Request) {
  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const dbHash = await getStoredPasswordHash();
  const envHash = envPasswordHash();
  const expected = dbHash ?? envHash;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'admin_disabled' }, { status: 401 });
  }

  const inputHash = sha256Hex(password);
  if (!timingSafeEqualHex(inputHash, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // DB 가 비어있는 상태에서 env 비번으로 로그인 성공한 경우 → DB 시드.
  // (시드 실패해도 로그인 자체는 진행)
  if (!dbHash && envHash) {
    await setStoredPasswordHash(envHash);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: expected,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
