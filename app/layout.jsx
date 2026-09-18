import './globals.css';
import AppProviders from '../components/AppProviders';

export const metadata = {
  title: 'ZAR.mn — Үл хөдлөх хөрөнгийн зар',
  description: 'Худалдаа, түрээсийн үл хөдлөх хөрөнгийн зарууд (Next.js + Supabase)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="mn">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
