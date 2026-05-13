import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import DataImportTool from '@/components/admin/DataImportTool';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect('/admin');
  return <DataImportTool />;
}
