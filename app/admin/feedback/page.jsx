import AdminFeedbackClient from '../../../components/AdminFeedbackClient';
import AdminNav from '../../../components/AdminNav';

export const metadata = { title: 'Админ — Санал хүсэлт (ZarBook.mn)' };

export default function AdminFeedbackPage() {
  return (
    <>
      <div className="page-container pb-0">
        <div className="mx-auto max-w-[1536px]">
          <AdminNav active="/admin/feedback" className="mb-4" />
        </div>
      </div>
      <AdminFeedbackClient />
    </>
  );
}

