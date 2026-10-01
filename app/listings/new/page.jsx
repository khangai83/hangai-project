import { Suspense } from 'react';
import AddListingClient from '../../../components/AddListingClient';

export const metadata = {
  title: 'Зар нэмэх — ZARLAA.MN',
  description: 'Үл хөдлөх болон бусад зарыг алхам алхмаар оруулж нийтлэх хуудас.',
};

// ⚠️ `AddListingClient` нь `useSearchParams()` (алхам/засах id) ашигладаг тул
//    `force-dynamic` — эс бөгөөс build үед «useSearchParams() should be wrapped
//    in a suspense boundary» гэсэн алдаа гарна ✗ (Suspense нь доор ч байна ✓)
export const dynamic = 'force-dynamic';

export default function NewListingPage() {
  return (
    <Suspense
      fallback={(
        <div className="page-container">
          <div className="px-5 py-16 text-center">
            <div className="spinner"></div>
            <p>Ачаалж байна...</p>
          </div>
        </div>
      )}
    >
      <AddListingClient />
    </Suspense>
  );
}
