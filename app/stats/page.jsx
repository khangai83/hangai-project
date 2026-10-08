import PriceStatsClient from '../../components/PriceStatsClient';

export const metadata = {
  title: 'Үнийн статистик — дүүрэг, хороогоор ₮/м² (ZARBOOK.MN)',
  description:
    'Улаанбаатар хотын орон сууцны зарууд дээр үндэслэсэн ₮/м² үнийн статистик — дүүрэг, хороогоор медиан ба дундаж үнэ.',
};

export default function StatsPage() {
  return <PriceStatsClient />;
}
