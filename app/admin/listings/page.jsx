import AdminListingsClient from '../../../components/AdminListingsClient';
import AdminNav from '../../../components/AdminNav';

export const metadata = { title: 'Админ — Зар удирдлага (ZarBook.mn)' };

export default function AdminListingsPage() {
  return (
    <>
      <div className="page-container pb-0">
        <div className="mx-auto max-w-[1536px]">
          <AdminNav active="/admin/listings" className="mb-4" />
        </div>
      </div>
      <AdminListingsClient />
    </>
  );
}

