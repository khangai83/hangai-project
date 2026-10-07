import SearchHistoryClient from '../../components/SearchHistoryClient';

export const metadata = { title: 'Хайлтын түүх — ZARLAA.MN' };

/**
 * 🕐 `/history` — «Хайлтын түүх» (сүүлийн хайлтууд). Хэрэглэгч хайх бүрд
 * автоматаар бүртгэгддэг хайлтуудыг КАРТ хэлбэрээр харуулна (2026-10-07).
 */
export default function HistoryPage() {
  return (
    <div className="page-container">
      <SearchHistoryClient />
    </div>
  );
}
