import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import VillageLabeler from '@/components/admin/VillageLabeler';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect('/admin');
  return <VillageLabeler />;
}
