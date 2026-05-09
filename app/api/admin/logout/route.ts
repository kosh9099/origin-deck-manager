import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
