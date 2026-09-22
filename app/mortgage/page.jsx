import Link from 'next/link';
import MortgageCalculator from '../../components/MortgageCalculator';
import { BOM, MORTGAGE_DEFAULTS } from '../../lib/marketData';

export const metadata = {
  title: 'Ипотекийн тооцоолуур — орон сууцны зээлийн сарын төлбөр (ZAR.mn)',
  description:
    'Орон сууцны зээлийн сарын төлбөр, урьдчилгаа, нийт хүүг онлайнаар тооцоол. Аннуитет схем, хүүгийн өөрчлөлтийн харьцуулалт, Монголбанкны бодлогын хүүний лавлагаа.',
};

const FAQ = [
  {
    q: 'Сарын төлбөр яаж бодогддог вэ?',
    a: 'Аннуитет схемээр: M = P·r / (1 − (1+r)^−n). P — зээлийн дүн (үнэ − урьдчилгаа), r — сарын хүү (жилийн хүү ÷ 12), n — нийт сар. Сар бүр ижил хэмжээгээр төлнө.',
  },
  {
    q: 'Хүүг хэдэн хувь авах вэ?',
    a: `Банк, хөтөлбөрөөс хамаарч өөр. Лавлагаа болгож Монголбанкны бодлогын хүүг (${BOM.policyRate}%, ${BOM.date}) ашигласан — бодит хүү нь банкны маржа, зээлдэгчийн түүхээс хамаарна.`,
  },
  {
    q: 'Урьдчилгаа хэд байх ёстой вэ?',
    a: 'Ихэнх банкинд 20–30% (зарим хөнгөлөлттэй хөтөлбөрт 10%). Урьдчилгаа их байх тусам сарын төлбөр, нийт хүү багасна.',
  },
  {
    q: 'Тооцоолол яг үнэн үү?',
    a: 'Энэ нь зөвхөн мэдээллийн зорилготой. Банкны шимтгэл, даатгал, нотариат, улсын бүртгэлийн хураамж ороогүй тул эцсийн дүнг банкны зээлийн бодит өртөг (ЗБӨ) — өөр шалгана уу.',
  },
];

export default function MortgagePage() {
  return (
    <div className="page-container">
      <div className="mx-auto max-w-[1000px]">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">🏦 Ипотекийн тооцоолуур</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Орон сууцны үнэ, урьдчилгаа болон зээлийн хүүгээ оруулаад <b>сарын төлбөр</b>,
            нийт хүү, урьдчилгааны хэмжээг шууд харна уу. Дэлгэрэнгүй хуудсан дээрх
            зарын үнээр автоматаар тооцоолохыг хүсвэл тухайн зарын хуудаснаас үзнэ үү.
          </p>
        </header>

        <MortgageCalculator defaultPrice={MORTGAGE_DEFAULTS.price} />

        <section className="section-card mt-6">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Түгээмэл асуулт</h2>
          <dl className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="text-[15px] font-semibold text-gray-900">{f.q}</dt>
                <dd className="mt-1 text-[14.5px] leading-relaxed text-gray-600">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="section-card mt-5 bg-gray-50">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-600">Тооцоололд ороогүй зүйлс</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] text-gray-600">
            <li>Банкны зээлийн шимтгэл, үйлчилгээний хураамж</li>
            <li>Үл хөдлөхийн даатгал, амьдралын даатгал (зарим банкинд заавал)</li>
            <li>Нотариатын баталгаажуулалт, улсын бүртгэлийн хураамж</li>
            <li>Үнэлгээний зардал, барьцааны бүртгэл</li>
          </ul>
          <p className="mt-3 text-[12.5px] text-gray-500">
            Монголбанкны «Зээлийн бодит өртгийн тооцоолуур» болон банкны ЗБӨ-тэй харьцуулна уу:{' '}
            <a href={BOM.url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
              {BOM.source}
            </a>
          </p>
        </section>

        <p className="mt-6 text-center text-[13px] text-gray-400">
          Зар хайхдаа: <Link href="/" className="font-semibold text-primary hover:underline">🏠 Үл хөдлөхийн зарууд</Link>
          {' · '}
          <Link href="/stats" className="font-semibold text-primary hover:underline">📊 Үнийн статистик</Link>
        </p>
      </div>
    </div>
  );
}
