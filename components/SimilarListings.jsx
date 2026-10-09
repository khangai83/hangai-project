'use client';

/**
 * 🔎 ТӨСТЭЙ ЗАРУУД — зарын дэлгэрэнгүй хуудасны ДООР (2026-10-09 (79))
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «зарын карт руу ороход төстэй заруудыг харуулах»
 *   → жишиг сайтын хэв: үндсэн агуулга ба нийтлэгчийн картын доор
 *   «🔎 Төстэй зарууд» гарчигтай, одоогийн ЗАРЫН КАРТ (`ListingCard`)-аар
 *   баганат grid харуулна ✓
 *
 * ⚠️ ЯАГААД ТУСДАА КОМПОНЕНТ ВЭ (шууд `ListingDetailClient` дотор биш):
 *   ① Ачааллын төлөв (`loading`/алдаа) нь зарын ҮНДСЭН агуулгаас ТУСДАА —
 *      төстэй зарууд ирэхгүй ч дэлгэрэнгүй хуудас бүтнээрээ ажиллана ✓
 *   ② `ListingDetailClient` нь 860+ мөртэй — тусдаа файл уншихад хялбар ✓
 *   ③ Нийтлэгчийн нэр/зураг (`author`) нь 2 дахь query (`fetchProfilesByIds`)
 *      — `HomeClient`-ийн ЯГ ижил арга ✓
 *
 * 📐 ДҮРЭМ:
 *   • Онооллын логик нь `lib/similarListings.mjs` (цэвэр, тестлэгддэг) дотор;
 *     энд ЗӨВХӨН дуудна ✓
 *   • 🚫 ХООСОН үед блок БҮХЭЛДЭЭ ГАРАХГҮЙ (`return null`) — «Төстэй зарууд
 *     олдсонгүй» гэсэн хоосон хайрцаг харуулахгүй ✓
 *   • 🚫 Алдаа гарвал ч мөн нууна (зөвхөн `console.warn`) — үндсэн
 *     агуулгад нөлөөлөхгүй ✓
 *   • 📱 Мобайл 1 багана · `sm` 2 · `lg` 3 · `2xl` 4 (жагсаалтын бусад
 *     хуудсуудтай ижил grid — `/favorites`-ийн адил) ✓
 *
 * 🔍 ХАЙХ ҮГ: SimilarListings, data-similar-listings, fetchSimilarListings,
 *    Төстэй зарууд
 */
import { useEffect, useState } from 'react';
import ListingCard from './ListingCard';
import { fetchSimilarListings, fetchProfilesByIds } from '../lib/queries';
import { formatAttrsLine } from '../lib/locationData';
import { normalizeError } from '../lib/errors';
import { SIMILAR_LISTINGS_LIMIT } from '../lib/similarListings.mjs';

export default function SimilarListings({ listing }) {
  // null = ачаалж байна (блок ХАРАГДАХГҮЙ) · [] = олдсонгүй (мөн нуугдана)
  const [items, setItems] = useState(null);
  const [authors, setAuthors] = useState({}); // { [user_id]: { displayName, avatarUrl } }

  const listingId = listing && listing.id;
  const section = (listing && listing.section) || 'real-estate';

  useEffect(() => {
    if (!listingId) {
      setItems([]);
      return undefined;
    }
    let mounted = true;
    (async () => {
      try {
        const rows = await fetchSimilarListings(listing, { limit: SIMILAR_LISTINGS_LIMIT });
        if (!mounted) return;
        setItems(rows);
        if (!rows.length) return;
        // 👤 Нийтлэгчийн нэр/зураг — 2 дахь query (RLS/`show_identity` дүрэм
        //    нь `fetchProfilesByIds` дотор хэрэгжинэ ✓). Алдаа гарвал зөвхөн
        //    нэр/зураггүй гарна — картууд ХЭВЭЭР харагдана ✓
        try {
          const map = await fetchProfilesByIds(rows.map((l) => l.user_id));
          if (mounted) setAuthors(map || {});
        } catch (err) {
          console.warn(normalizeError(err));
        }
      } catch (err) {
        console.warn(normalizeError(err));
        if (mounted) setItems([]);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  if (!items || items.length === 0) return null;

  return (
    <section data-similar-listings className="mt-6">
      <h2 className="mb-3 text-lg font-bold text-gray-800">🔎 Төстэй зарууд</h2>
      {/* 🧱 Баганат grid — карт нь БОСОО (`ListingCard`) тул бүтэн өргөнтэй
          нэг багана биш, grid шаардна ✓
          🆕 2026-10-09 (84): 📱 1 → 📲 sm:2 → 🖥 lg:3 → 🖥 xl:4 — хэрэглэгчийн
             хүсэлт: «bas zar luu orood tustei zar deer bas» (4 карт) ⇒ нүүр
             хуудасны grid (`HomeClient.jsx`) — `lg:grid-cols-3 xl:grid-cols-4`
             хэвтэй ЯГ ИЖИЛ болгов ✓ (⏳ урьд нь lg:3 · 2xl:4 байв) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            author={authors[l.user_id]}
            attrsLine={formatAttrsLine(l.section || section, l.attrs, l.category)}
          />
        ))}
      </div>
    </section>
  );
}
