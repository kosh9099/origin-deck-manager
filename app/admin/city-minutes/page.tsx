import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import CityMinutesView from '@/components/admin/CityMinutesView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect('/admin');
  return <CityMinutesView />;
}
