'use client';

// ============================================================
// searchHistory.js — «🕐 Хайлтын түүх»-ийн КЛИЕНТ тал (hook + storage)
//
// ⏳ 2026-10-07: «Мессеж icon-ий дараа цагийн icon оруулаад, тэр рүү орход
//   хайлтуудыг карт хэлбэрээр харуул» (HomeClient хайх БҮРД бичдэг байв)
// ✏️ 2026-10-08 (68, хэрэглэгчийн хүсэлт): «хайлтын түүх дээр орж үзсэн
//   заруудыг л зөвхөн гаргадаг болгоорой, одоо хайлтыг гаргаад байгаа, энэ
//   нэрийг хэвээр үлдээ» ⇒ хайлт ОГТ бүртгэгдэхгүй боллоо; зөвхөн
//   `recordListingView()` — `components/ListingDetailClient.jsx` зар нээх
//   бүрд түүхэнд бичнэ ✓ (товч/хуудасны нэр «🕐 Хайлтын түүх» ХЭВЭЭР ✓)
//
// ХАДГАЛАЛТ (`lib/savedSearches.js`-ийн ЯГ ИЖИЛ hybrid зарчим):
//   • ЗОЧИН  → `localStorage` (`zarmn_search_history_v1`) — тэр дороо ажиллана
//   • НЭВТЭРСЭН → Supabase `search_history` хүснэгт (RLS: зөвхөн өөрийн мөр)
//              → олон төхөөрөмж дээр синхрон ✓ (0032_search_history.sql)
//
// ⚠️ МИГРАЦ ОРООГҮЙ Ч АЖИЛЛАНА (энэ аппын үндсэн зарчим): DB-д хүснэгт
//    байхгүй бол (`PGRST205`/`42P01`) ЧИМЭЭГҮЙ localStorage руу буцна —
//    функц бүрэн ажиллана, зөвхөн синхрон байхгүй ✓
//
// ⚠️ ЦЭВЭР ЛОГИК нь `lib/searchHistory.mjs` (Node тестэд ШУУД ажиллана);
//    энэ файл нь зөвхөн React hook + storage/DB холболт ✓
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from './supabaseClient';
import {
  SEARCH_HISTORY_EVENT, SEARCH_HISTORY_KEY, SEARCH_HISTORY_LIMIT,
  historyKey, historyListingId, listingHistoryUrl,
  normalizeHistoryRow, parseHistoryList, recordHistory, serializeHistoryList,
} from './searchHistory.mjs';

const DB_TABLE = 'search_history';

// ---- localStorage (зочин горим) -----------------------------------------

/** localStorage-аас жагсаалт унших (алдаа → хоосон массив) */
function readLocal() {
  if (typeof window === 'undefined') return [];
  try {
    return parseHistoryList(window.localStorage.getItem(SEARCH_HISTORY_KEY));
  } catch (e) {
    return [];
  }
}

/** localStorage-д бичиж, бүх компонентод мэдэгдэнэ (`favorites.js`-ийн адил) */
function writeLocal(list) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SEARCH_HISTORY_KEY,
      serializeHistoryList((list || []).slice(0, SEARCH_HISTORY_LIMIT))
    );
    window.dispatchEvent(new Event(SEARCH_HISTORY_EVENT));
  } catch (e) {
    /* private mode гэх мэт — чимээгүй өнгөрөөнө */
  }
}

// ---- Supabase DB (нэвтэрсэн горим) ---------------------------------------

/** Хүснэгт байхгүй (= миграц ороогүй) алдаа мөн эсэх */
function dbMissingTable(error) {
  const msg = `${(error && error.code) || ''} ${(error && error.message) || ''}`;
  return /PGRST205|42P01|does not exist|schema cache|relation|search_history/i.test(msg);
}

/** Миний түүх (хамгийн сүүлд ҮЗСЭН зарын эхэнд) — DB мөрүүд нэг хэлбэрт орно */
async function fetchDb(userId) {
  const sb = getSupabase();
  if (!sb || !userId) throw new Error('no-client');
  const { data, error } = await sb
    .from(DB_TABLE)
    .select('id, url, created_at, last_seen_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
    .limit(SEARCH_HISTORY_LIMIT);
  if (error) throw error;
  const rows = data || [];
  // 🗑 2026-10-08 (68): ХУУЧИН хайлтын мөрүүд (`/?category=…`) нь түүхэнд
  //    ХАРАГДАХГҮЙ болсон тул best-effort УСТГАНА (устгаж чадвал; алдаа
  //    гарвал чимээгүй — UI нь `normalizeHistoryRow`-оор шүүж байгаа ✓)
  const legacy = rows.filter((r) => !historyListingId(r.url)).map((r) => r.id);
  if (legacy.length) {
    Promise.resolve(
      sb.from(DB_TABLE).delete().eq('user_id', userId).in('id', legacy)
    ).catch(() => {});
  }
  return rows.map(normalizeHistoryRow).filter(Boolean);
}

/**
 * Нэг зарыг түүхэнд бүртгэх (upsert — ижил `key` дахин үзвэл `last_seen_at`
 * шинэчлэгдэж, давхардахгүй ✓). `unique (user_id, key)` нь зэрэгцээ хүсэлтийн
 * сүлжээ.
 */
async function upsertDb(userId, key, url, nowIso) {
  const sb = getSupabase();
  if (!sb || !userId) throw new Error('no-client');
  const { data, error } = await sb
    .from(DB_TABLE)
    .upsert(
      { user_id: userId, key, url, last_seen_at: nowIso },
      { onConflict: 'user_id,key' }
    )
    .select('id, url, created_at, last_seen_at')
    .single();
  if (error) throw error;
  return normalizeHistoryRow(data);
}

/** Нэг мөрийг устгах (id нь uuid) */
async function deleteDb(id) {
  const sb = getSupabase();
  if (!sb) throw new Error('no-client');
  const { error } = await sb.from(DB_TABLE).delete().eq('id', id);
  if (error) throw error;
}

/** Бүх хайлтын түүхийг устгах (зөвхөн өөрийн, RLS) */
async function clearDb(userId) {
  const sb = getSupabase();
  if (!sb || !userId) throw new Error('no-client');
  const { error } = await sb.from(DB_TABLE).delete().eq('user_id', userId);
  if (error) throw error;
}

/**
 * Зочин байхдаа бүртгэснээ нэвтэрсний дараа DB рүү ШИЛЖҮҮЛНЭ (best-effort).
 * ⚠️ Алдаа гарвал чимээгүй — шилжилт нь заавал биш (функц эвдрэхгүй ✓)
 */
async function migrateLocalToDb(userId) {
  const local = readLocal();
  if (!local.length || !userId) return false;
  let moved = false;
  for (const it of local) {
    try {
      const key = historyKey(it.url);
      if (key) await upsertDb(userId, key, listingHistoryUrl(historyListingId(it.url)), it.createdAt || new Date().toISOString());
      moved = true;
    } catch (e) {
      // чимээгүй — дараагийнхаа оролдоно
    }
  }
  if (moved) writeLocal([]); // зөвхөн шилжсэн бол локалыг цэвэрлэнэ
  return moved;
}

// ---- 🕐 Зар үзсэнийг бүртгэх (гаднаас дуудна) ---------------------------

/**
 * 🕐 ЗАР ҮЗСНИЙГ түүхэнд БҮРТГЭХ — `ListingDetailClient`-ийн зар нээх эффект
 * дуудна. ⚠️ Жагсаалтыг ТАТАХГҮЙ/төлөв ХӨТЛӨХГҮЙ (hook биш) — зөвхөн бичилт,
 * ингэснээр зар харах БҮРД 60 мөрийн query явахгүй ✓
 *
 *   ① Нэвтэрсэн + Supabase байгаа → `search_history` (upsert, `last_seen_at`)
 *   ② Зочин (эсвэл DB алдаа/миграцгүй) → `localStorage` — чимээгүй буулт ✓
 *   ③ Зарын линк биш → `{ ok:false }` (хайлт ОГТ бүртгэгдэхгүй ✓)
 * @param {string|null} userId — `useAuth().user?.id`
 * @param {string} listingId — зарын id (`/listings/[id]`-ийн `id`)
 * @returns {Promise<{ok:boolean, source?:'db'|'local', reason?:string}>}
 */
export async function recordListingView(userId, listingId) {
  const url = listingHistoryUrl(listingId);
  const key = historyKey(url);
  if (!key) return { ok: false, reason: 'not-listing' };
  const now = new Date().toISOString();

  if (userId && getSupabase()) {
    try {
      await upsertDb(userId, key, url, now);
      return { ok: true, source: 'db' };
    } catch (err) {
      // ⚠️ Миграц байхгүй/сүлжээний алдаа → localStorage-д бичээд үргэлжлүүлнэ
      //    (нэвтрэхэд `migrateLocalToDb` дахин DB рүү шилжүүлнэ ✓)
      if (dbMissingTable(err)) console.warn('[search_history] migration байхгүй — localStorage горим.');
    }
  }

  const { list } = recordHistory(readLocal(), url, now);
  writeLocal(list);
  return { ok: true, source: 'local' };
}

// ---- React hook ----------------------------------------------------------

/**
 * 🕐 ХАЙЛТЫН ТҮҮХИЙГ унших/устгах hook (DB эсвэл localStorage).
 *
 * ⚠️ 2026-10-08 (68): `record()` БАЙХГҮЙ болсон — хайлт ОГТ бүртгэгдэхгүй ✓
 *    Бүртгэл нь зөвхөн зарын хуудаснаас: `recordListingView(userId, listingId)`
 *    (доор) — үүнийг `components/ListingDetailClient.jsx` дуудна ✓
 * @param {{id?: string}|null} user — `useAuth().user` (нэвтрээгүй бол null)
 * @returns {{
 *   items: Array<{id:string,url:string,listingId:string,createdAt:string}>,
 *   loading: boolean, error: string, source: 'db'|'local',
 *   remove: (id:string)=>Promise<void>,
 *   clear: ()=>Promise<void>,
 * }}
 */
export function useSearchHistory(user) {
  const userId = (user && user.id) || null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState('local'); // 'db' | 'local'
  // ⚠️ `source`-ыг event listener дотор уншина — render-ийн хуучин утга
  //    барихгүйн тулд ref-ээр толь бичнэ (React closure-ийн стандарт шийдэл)
  const sourceRef = useRef('local');

  const applyLocal = useCallback(() => {
    sourceRef.current = 'local';
    setSource('local');
    setItems(readLocal());
    setError('');
    setLoading(false);
  }, []);

  // ---- Ачаалах (userId солигдох бүрд) ----
  useEffect(() => {
    let active = true;
    setLoading(true);

    (async () => {
      if (!userId || !getSupabase()) {
        if (active) applyLocal();
        return;
      }
      try {
        // 🪄 Зочин байхдаа бүртгэснээ нэг удаа DB рүү шилжүүлнэ
        await migrateLocalToDb(userId);
        const rows = await fetchDb(userId);
        if (!active) return;
        sourceRef.current = 'db';
        setSource('db');
        setItems(rows);
        setError('');
      } catch (err) {
        // ⚠️ Миграц/сүлжээний алдаа ч хэрэглэгчийн өгөгдлийг админа
        //    гаргахгүйн тулд localStorage руу буцна (функц бүтэн ажиллана ✓)
        if (dbMissingTable(err)) console.warn('[search_history] migration байхгүй — localStorage горим.');
        if (active) applyLocal();
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [userId, applyLocal]);

  // ---- localStorage горимд: event/`storage` сонсоно ----
  useEffect(() => {
    if (source !== 'local') return undefined;
    const sync = () => setItems(readLocal());
    window.addEventListener(SEARCH_HISTORY_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SEARCH_HISTORY_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [source]);

  // ⚠️ 2026-10-08 (68): эндээс `record()`-ыг ХАСсан — хайлт бүртгэгдэхгүй ✓
  //    Бүртгэл нь `recordListingView()` (энэ файлын экспорт) — зарын хуудас
  //    (`ListingDetailClient`) зар нээх бүрд дуудна. Тиймээс энэ hook-ийн
  //    `items` нь ЗӨВХӨН ҮЗСЭН ЗАРУУДЫН мөрүүд болно ✓

  /** 🗑 Нэг түүхийн мөрийг устгах */
  const remove = useCallback(async (id) => {
    if (sourceRef.current === 'db' && userId) {
      try {
        await deleteDb(id);
      } catch (e) {
        /* чимээгүй — доорх мөрийг UI-аас хасна */
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
      return;
    }
    writeLocal(readLocal().filter((it) => it.id !== id));
  }, [userId]);

  /** 🗑 Бүгдийг устгах */
  const clear = useCallback(async () => {
    if (sourceRef.current === 'db' && userId) {
      try {
        await clearDb(userId);
      } catch (e) {
        /* чимээгүй */
      }
      setItems([]);
      return;
    }
    writeLocal([]);
  }, [userId]);

  return { items, loading, error, source, remove, clear };
}

