import ListingDetailClient from '../../../components/ListingDetailClient';

export const metadata = { title: 'Зарын дэлгэрэнгүй — ZAR.mn' };
export const dynamic = 'force-dynamic';

export default async function ListingDetailPage({ params }) {
  const { id } = await params;
  return <ListingDetailClient id={id} />;
}
