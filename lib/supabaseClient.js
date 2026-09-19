import { createClient } from '@supabase/supabase-js';

let _client = null;
let _warned = false;

/**
 * Supabase клиент (anonymous / public). Хэрэглэгч төлөвлөх, зарын CRUD,
 * Storage upload-ийг клиент талд хийхэд ашиглана. RLS дээр суурилдаг.
 *
 * Environment-д NEXT_PUBLIC_SUPABASE_URL болон NEXT_PUBLIC_SUPABASE_ANON_KEY
 * байхгүй бол null буцаана (тохиргоо гүйцэд болоогүй үед).
 */
export function getSupabase() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Бодит тохиргоо байгаа эсэхийг шалгах (placeholder эсвэл хоосон бол null)
  const isPlaceholder =
    !url ||
    !anonKey ||
    url.includes('TANII_PROJECT_REF') ||
    anonKey.includes('tanii_anon_key') ||
    anonKey.includes('your-anon');

  if (isPlaceholder) {
    // ЯАГААД ЭНЭ WARNING ХЭРЭГТЭЙ ВЭ:
    // NEXT_PUBLIC_* утгууд нь compile (build) үед bundle дотор ШУУД бичигддэг
    // бөгөөд Next.js `.env.local`-ийг зөвхөн dev server ЭХЛЭХ үед уншдаг. Тиймээс
    // env-ийг зассан боловч хуучин процесс / browser-ийн хуучин bundle ажиллаж
    // байвал энд null буцаж, UI дээр «Supabase тохиргоо олдсонгүй» гэж гардаг.
    // Аль хувьсагч дутуу/placeholder болохыг нэрээр нь хэлж, засварын алхмыг өгнө.
    if (!_warned) {
      _warned = true;
      const problems = [
        !url && 'NEXT_PUBLIC_SUPABASE_URL (тохируулаагүй)',
        !anonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY (тохируулаагүй)',
        url && url.includes('TANII_PROJECT_REF') && 'NEXT_PUBLIC_SUPABASE_URL (placeholder утгатай)',
        anonKey &&
          (anonKey.includes('tanii_anon_key') || anonKey.includes('your-anon')) &&
          'NEXT_PUBLIC_SUPABASE_ANON_KEY (placeholder утгатай)',
      ].filter(Boolean);
      console.error(
        `[supabase] Тохиргоо дутуу: ${problems.join(', ') || 'тодорхойгүй'}. ` +
          'NEXT_PUBLIC_* утгууд нь ЗӨВХӨН build үед bundle-д ордог тул ' +
          '.env.local-аа зассаны дараа (1) dev server-ээ бүрэн зогсоож дахин ' +
          'эхлүүлэх (npm run dev), (2) browser-ээ hard refresh (Cmd+Shift+R) хийх ' +
          'шаардлагатай. Шалгах: npm run check:supabase'
      );
    }
    return null;
  }

  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

export const IMAGE_BUCKET = 'listing-images';
