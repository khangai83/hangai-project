// ============================================================
// errors.js — Supabase/сүлжээний алдааг хүн уншиж болохуйц Error болгож хөрвүүлэх
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
// postgrest-js нь холболтын алдаа гарвал `{ message, details, hint, code }` гэсэн
// ЭНГИЙН объектыг (name талбаргүй, Error instance биш) throw хийдэг.
// Ийм объектыг шууд `console.error(obj)` гэж дамжуулбал Next.js-ийн dev overlay
// нь `next/dist/client/lib/console.js → formatObject()` дотроос түүнийг **{}**
// гэж харуулдаг (Object.getOwnPropertyDescriptor(arg, 'key') гэсэн алдаатай
// мөртэй тул бүх талбар алгасагдана). Үр дүнд нь ямар алдаа гарах нь харагдахгүй.
//
// Энэ файл ийм объектыг БОДИТ `Error` болгож, сүлжээний алдаа бол
// NEXT_PUBLIC_SUPABASE_URL-ийг шалгахыг сануулсан ойлгомжтой мессеж өгнө.
// ============================================================

/**
 * Алдаа нь сүлжээ/холболтын алдаа мөн эсэх.
 * (DNS resolve болохгүй, сервер олдохгүй, timeout гэх мэт)
 */
export function isNetworkError(error) {
  const text = `${(error && error.message) || ''} ${(error && error.details) || ''} ${error || ''}`;
  return /failed to fetch|fetch failed|networkerror|network request failed|err_name_not_resolved|err_connection|err_internet|load failed|enotfound|econnrefused|etimedout|timeout/i.test(
    text
  );
}

/**
 * Аливаа алдааг бодит `Error` болгон хөрвүүлнэ.
 * - `Error` бол өөрчлөлтгүй буцаана.
 * - Supabase-ийн энгийн объект бол message/details/hint/code-оос мессеж угсарна.
 * - Сүлжээний алдаа бол Supabase URL-аа шалгахыг сануулна.
 */
export function normalizeError(error) {
  if (!error) return new Error('Тодорхойгүй алдаа гарлаа.');
  if (error instanceof Error) return error;

  const message = error.message || String(error);

  if (isNetworkError(error)) {
    const target = process.env.NEXT_PUBLIC_SUPABASE_URL || '(тохируулаагүй)';
    const err = new Error(
      `Supabase-д холбогдож чадсангүй (${message}). ` +
        `NEXT_PUBLIC_SUPABASE_URL = ${target} — энэ URL болон клуч зөв эсэх, ` +
        `төсөл идэвхтэй эсэх, интернэт холболтоо шалгана уу. ` +
        `Шалгах: npm run check:supabase`
    );
    err.cause = error;
    err.code = error.code || 'NETWORK_ERROR';
    return err;
  }

  const extra = [error.details, error.hint, error.code].filter(Boolean).join(' | ');
  const err = new Error(extra ? `${message} (${extra})` : message);
  err.cause = error;
  if (error.code) err.code = error.code;
  return err;
}

/** console.error / toast-д зориулсан богино, уншигдах текст */
export function errorText(error) {
  return normalizeError(error).message;
}
