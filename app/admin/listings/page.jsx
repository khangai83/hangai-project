import AdminListingsClient from '../../../components/AdminListingsClient';
import AdminNav from '../../../components/AdminNav';

export const metadata = { title: 'Админ — Зар удирдлага (Зарлаа.mn)' };

export default function AdminListingsPage() {
  return (
    <>
      <div className="page-container pb-0">
        <div className="mx-auto max-w-[1280px]">
          <AdminNav active="/admin/listings" className="mb-4" />
        </div>
      </div>
      <AdminListingsClient />
    </>
  );
}

