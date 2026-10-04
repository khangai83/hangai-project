import AdminUsersClient from '../../../components/AdminUsersClient';
import AdminNav from '../../../components/AdminNav';

export const metadata = { title: 'Админ — Хэрэглэгчид (ZARLAA.MN)' };

export default function AdminUsersPage() {
  return (
    <>
      <div className="page-container pb-0">
        <div className="mx-auto max-w-[1536px]">
          <AdminNav active="/admin/users" className="mb-4" />
        </div>
      </div>
      <AdminUsersClient />
    </>
  );
}

