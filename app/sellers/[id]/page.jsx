import SellerListingsClient from '../../../components/SellerListingsClient';

export const metadata = { title: 'Зар нийтлэгчийн зарууд — ZAR.mn' };
export const dynamic = 'force-dynamic';

export default async function SellerPage({ params }) {
  const { id } = await params;
  return <SellerListingsClient sellerId={id} />;
}
