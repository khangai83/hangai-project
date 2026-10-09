import SearchHistoryClient from '../../components/SearchHistoryClient';

export const metadata = { title: 'Хайлтын түүх — ZarBook.mn' };

/**
 * 🕐 `/history` — «Хайлтын түүх» (сүүлд ҮЗСЭН ЗАРУУД).
 * ⚠️ 2026-10-08 (68): нэр ХЭВЭЭР, агуулга нь өөрчлөгдөв — өмнө нь хайлтын
 *    ШҮҮЛТҮҮР (хайх бүрд автомат бүртгэл) харагдаж байв; одоо зөвхөн зар
 *    НЭЭЖ ҮЗСЭН зарууд (`search_history.url = '/listings/<id>'`) ✓
 */
export default function HistoryPage() {
  return (
    <div className="page-container">
      <SearchHistoryClient />
    </div>
  );
}
