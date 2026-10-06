'use client';

// ============================================================
// savedSearches.js — «🔖 Хадгалсан хайлт»-ын КЛИЕНТ тал (hook + storage)
//
// ХЭРЭГЛЭГЧИЙН СОНГОЛТ (2026-10-06): «нэвтэрсэн бол DB, зочин бол
// localStorage» — хоёуланг нь дэмжинэ ✓
//   • ЗОЧИН  → `localStorage` (`zarmn_saved_searches_v1`) — `lib/favorites.js`-ийн
//              ЯГ ИЖИЛ загвар (тэр дороо ажиллана, DB шаардлагагүй ✓)
//   • НЭВТЭРСЭН → Supabase `saved_searches` хүснэгт (RLS: зөвхөн өөрийн мөр)
//              → олон төхөөрөмж дээр синхрон ✓ (0031_saved_searches.sql)
//
// ⚠️ МИГРАЦ ОРООГҮЙ Ч АЖИЛЛАНА (энэ аппын үндсэн зарчим): DB-д хүснэгт
//    байхгүй бол (`PGRST205`/`42P01`) ЧИМЭЭГҮЙ localStorage руу буцна —
//    функц бүрэн ажиллана, зөвхөн синхрон байхгүй ✓
//
// ⚠️ ЦЭВЭР ЛОГИК нь `lib/savedSearch.mjs` (Node тестэд ШУУД ажиллана);
//    энэ файл нь зөвхөн React hook + storage/DB холболт (messagesClient-ийн
//    ЯГ ИЖИЛ салангид зарчим ✓)
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from './supabaseClient';
import {
  SAVED_SEARCHES_KEY, SAVED_SEARCH_EVENT, SAVED_SEARCH_LIMIT,
  newSavedSearchId, normalizeSavedSearchRow, normalizeSavedSearchUrl,
  parseSavedSearchList, savedSearchKey, serializeSavedSearchList,
} from './savedSearch.mjs';

const DB_TABLE = 'saved_searches';

// ---- localStorage (зочин горим) -----------------------------------------

/** localStorage-аас жагсаалт унших (алдаа → хоосон массив) */
function readLocal() {
  if (typeof window === 'undefined') return [];
  try {
    return parseSavedSearchList(window.localStorage.getItem(SAVED_SEARCHES_KEY));
  } catch (e) {
    return [];
  }
}

/** localStorage-д бичиж, бүх компонентод мэдэгдэнэ (`favorites.js`-ийн адил) */
function writeLocal(list) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SAVED_SEARCHES_KEY,
      serializeSavedSearchList((list || []).slice(0, SAVED_SEARCH_LIMIT))
    );
    window.dispatchEvent(new Event(SAVED_SEARCH_EVENT));
  } catch (e) {
    /* private mode гэх мэт — чимээгүй өнгөрөөнө */
  }
}

// ---- Supabase DB (нэвтэрсэн горим) ---------------------------------------

/** Хүснэгт байхгүй (= миграц ороогүй) алдаа мөн эсэх */
function dbMissingTable(error) {
  const msg = `${(error && error.code) || ''} ${(error && error.message) || ''}`;
  return /PGRST205|42P01|does not exist|schema cache|relation|saved_searches/i.test(msg);
}

/** Миний хадгалсан хайлтууд (шинэ нь эхэнд) */
async function fetchDb(userId) {
  const sb = getSupabase();
  if (!sb || !userId) throw new Error('no-client');
  const { data, error } = await sb
    .from(DB_TABLE)
    .select('id, url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(SAVED_SEARCH_LIMIT);
  if (error) throw error;
  return (data || []).map(normalizeSavedSearchRow).filter(Boolean);
}

/** Нэг хайлт хадгалах (давхардвал `23505` — чимээгүй алгасна) */
async function insertDb(userId, url) {
  const sb = getSupabase();
  if (!sb || !userId) throw new Error('no-client');
  const { data, error } = await sb
    .from(DB_TABLE)
    .insert({ user_id: userId, url })
    .select('id, url, created_at')
    .single();
  if (error) throw error;
  return normalizeSavedSearchRow(data);
}

/** Нэг мөрийг устгах (id нь uuid) */
async function deleteDb(id) {
  const sb = getSupabase();
  if (!sb) throw new Error('no-client');
  const { error } = await sb.from(DB_TABLE).delete().eq('id', id);
  if (error) throw error;
}

/** Бүх хадгалсан хайлтыг устгах (зөвхөн өөрийн, RLS) */
async function clearDb(userId) {
  const sb = getSupabase();
  if (!sb || !userId) throw new Error('no-client');
  const { error } = await sb.from(DB_TABLE).delete().eq('user_id', userId);
  if (error) throw error;
}

/**
 * Зочин байхдаа хадгалснаа нэвтэрсний дараа DB рүү ШИЛЖҮҮЛНЭ (best-effort).
 * ⚠️ Алдаа гарвал чимээгүй — шилжилт нь заавал биш (функц эвдрэхгүй ✓)
 */
async function migrateLocalToDb(userId) {
  const local = readLocal();
  if (!local.length || !userId) return false;
  let moved = false;
  for (const it of local) {
    try {
      await insertDb(userId, it.url);
      moved = true;
    } catch (e) {
      // `23505` (аль хэдийн байна) → хэвийн; бусад алдааг ч алгасна
    }
  }
  if (moved) writeLocal([]); // зөвхөн шилжсэн бол локалыг цэвэрлэнэ
  return moved;
}

// ---- React hook ----------------------------------------------------------

/**
 * Хадгалсан хайлтын жагсаалтыг удирдах hook (DB эсвэл localStorage).
 *
 * @param {{id?: string}|null} user — `useAuth().user` (нэвтрээгүй бол null)
 * @returns {{
 *   items: Array<{id:string,url:string,createdAt:string}>,
 *   loading: boolean, error: string, source: 'db'|'local',
 *   isSaved: (url:string)=>boolean,
 *   save: (url:string)=>Promise<{ok:boolean, reason?:string}>,
 *   remove: (id:string)=>Promise<void>,
 *   clear: ()=>Promise<void>,
 * }}
 */
export function useSavedSearches(user) {
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
        // 🪄 Зочин байхдаа хадгалснаа нэг удаа DB рүү шилжүүлнэ
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
    window.addEventListener(SAVED_SEARCH_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SAVED_SEARCH_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [source]);

  // ---- Давхардлын түлхүүрүүд (render-д хурдан шалгах) ----
  const keySet = useMemo(() => new Set(items.map((it) => savedSearchKey(it.url))), [items]);

  const isSaved = useCallback((url) => {
    const key = savedSearchKey(url);
    return !!key && keySet.has(key);
  }, [keySet]);

  /** 🔖 Хайлт хадгалах. Давхардвал `{ ok:false, reason:'duplicate' }` */
  const save = useCallback(async (url) => {
    const clean = normalizeSavedSearchUrl(url);
    const key = savedSearchKey(clean);
    if (!key) return { ok: false, reason: 'empty' };
    if (keySet.has(key)) return { ok: false, reason: 'duplicate' };

    if (sourceRef.current === 'db' && userId) {
      try {
        const row = await insertDb(userId, clean);
        if (row) setItems((prev) => [row, ...prev]);
        return { ok: true };
      } catch (err) {
        // 23505 = давхардал (зэрэгцээ хүсэлт) — амжилттай гэж үзнэ
        if (err && err.code === '23505') return { ok: false, reason: 'duplicate' };
        // Бусад алдаа → localStorage-д хадгалаад үргэлжлүүлнэ (алдагдахгүй ✓)
        const next = [{ id: newSavedSearchId(), url: clean, createdAt: new Date().toISOString() }, ...readLocal()];
        writeLocal(next);
        return { ok: true };
      }
    }

    const next = [{ id: newSavedSearchId(), url: clean, createdAt: new Date().toISOString() }, ...readLocal()];
    writeLocal(next);
    setItems(next.slice(0, SAVED_SEARCH_LIMIT));
    return { ok: true };
  }, [keySet, userId]);

  /** 🗑 Нэг хадгалсан хайлтыг устгах */
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

  return { items, loading, error, source, isSaved, save, remove, clear };
}

