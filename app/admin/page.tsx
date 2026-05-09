import { isAdminAuthenticated } from '@/lib/admin/auth';
import LoginForm from '@/components/admin/LoginForm';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  return authed ? <AdminDashboard /> : <LoginForm />;
}
