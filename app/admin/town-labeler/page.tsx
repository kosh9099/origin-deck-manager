import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import TownLabeler from '@/components/admin/TownLabeler';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect('/admin');
  return <TownLabeler />;
}
