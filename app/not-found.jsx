import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-container">
      <div className="px-5 py-20 text-center">
        <div className="mb-4 text-6xl font-bold text-gray-300">404</div>
        <h3 className="mb-2 text-xl font-semibold">Хуудас олдсонгүй</h3>
        <p className="text-gray-500">Таны хайсан хуудас байхгүй эсвэл устгагдсан байна.</p>
        <Link href="/" className="btn btn-primary mt-4">← Нүүр хуудас</Link>
      </div>
    </div>
  );
}
