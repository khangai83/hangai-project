import NotificationsClient from '../../components/NotificationsClient';

export const metadata = { title: 'Мэдэгдэл — ZarBook.mn' };

/**
 * 🔔 `/notifications` — «Мэдэгдэл» (2026-10-08). Хэрэглэгчийн хүсэлт:
 *   «facebook шиг notification тэй болгоё… ямар ямар хэрэглэгч ямар зар дээр нь
 *   like дараад байгаа нь зар оруулсан хэрэглэгчид харагдаг байх. Хэзээ ямар
 *   дугаартай хэрэглэгч like дарсан нь харагддаг байх» ✓
 * ⚠️ Хадгалалт: `public.notifications` (0040_notifications.sql) — мөрийг
 *    DB-ийн триггер бичнэ (клиент INSERT хийхгүй ✓). RLS нь зөвхөн
 *    хүлээн авагчийн (`user_id = auth.uid()`) мөрийг буцаана ✓
 */
export default function NotificationsPage() {
  return (
    <div className="page-container">
      <NotificationsClient />
    </div>
  );
}
