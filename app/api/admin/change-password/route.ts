import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  getEffectivePasswordHash,
  isAdminAuthenticated,
  setStoredPasswordHash,
  sha256Hex,
  timingSafeEqualHex,
} from '@/lib/admin/auth';

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let currentPassword = '';
  let newPassword = '';
  try {
    const body = await req.json();
    currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (newPassword.length < 4) {
    return NextResponse.json({ ok: false, error: 'too_short' }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ ok: false, error: 'same_password' }, { status: 400 });
  }

  const expected = await getEffectivePasswordHash();
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'admin_disabled' }, { status: 401 });
  }
  const currentHash = sha256Hex(currentPassword);
  if (!timingSafeEqualHex(currentHash, expected)) {
    return NextResponse.json({ ok: false, error: 'wrong_current' }, { status: 401 });
  }

  const newHash = sha256Hex(newPassword);
  const ok = await setStoredPasswordHash(newHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }

  // 변경된 해시로 쿠키 갱신 → 현재 세션 유지
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: newHash,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
