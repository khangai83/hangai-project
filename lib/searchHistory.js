'use client';

// ============================================================
// searchHistory.js — «🕐 Хайлтын түүх»-ийн КЛИЕНТ тал (hook + storage)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-07): «Мессеж icon-ий дараа цагийн icon
//   оруулаад, тэр рүү орход тухайн хэрэглэгчийн хайлтуудыг карт хэлбэрээр
//   харуул» → HomeClient хайх БҮРД энэ hook-ийн `record()`-оор АВТОМАТААР
//   бүртгэгдэнэ ✓
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from './supabaseClient';
import { savedSearchKey, normalizeSavedSearchUrl } from './savedSearch.mjs';
import {
  SEARCH_HISTORY_EVENT, SEARCH_HISTORY_KEY, SEARCH_HISTORY_LIMIT,
  newHistoryId, normalizeHistoryRow, parseHistoryList, recordHistory,
  serializeHistoryList,
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

/** Миний хайлтын түүх (хамгийн сүүлд хайснаар эхэнд) */
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
  return (data || []).map(normalizeHistoryRow).filter(Boolean);
}

/**
 * Хайлтыг бүртгэх (upsert — ижил `key` дахин хайвал `last_seen_at` шинэчлэгдэж,
 * давхардахгүй ✓). `unique (user_id, key)` нь зэрэгцээ хүсэлтийн сүлжээ.
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
      const key = savedSearchKey(it.url);
      if (key) await upsertDb(userId, key, it.url, it.createdAt || new Date().toISOString());
      moved = true;
    } catch (e) {
      // чимээгүй — дараагийнхаа оролдоно
    }
  }
  if (moved) writeLocal([]); // зөвхөн шилжсэн бол локалыг цэвэрлэнэ
  return moved;
}

// ---- React hook ----------------------------------------------------------

/**
 * Хайлтын түүхийг удирдах hook (DB эсвэл localStorage).
 *
 * @param {{id?: string}|null} user — `useAuth().user` (нэвтрээгүй бол null)
 * @returns {{
 *   items: Array<{id:string,url:string,createdAt:string}>,
 *   loading: boolean, error: string, source: 'db'|'local',
 *   record: (url:string)=>Promise<{ok:boolean, reason?:string}>,
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

  /** 🕐 Хайлтыг түүхэнд бүртгэх (утгагүй «Бүх зар» бол `{ ok:false }`) */
  const record = useCallback(async (url) => {
    const clean = normalizeSavedSearchUrl(url);
    const key = savedSearchKey(clean);
    if (!key) return { ok: false, reason: 'empty' };
    const now = new Date().toISOString();

    if (sourceRef.current === 'db' && userId) {
      try {
        const row = await upsertDb(userId, key, clean, now);
        setItems((prev) => {
          const kept = prev.filter((it) => savedSearchKey(it.url) !== key);
          const entry = row && row.id ? row : { id: newHistoryId(), url: clean, createdAt: now };
          return [entry, ...kept].slice(0, SEARCH_HISTORY_LIMIT);
        });
        return { ok: true };
      } catch (err) {
        // ⚠️ DB алдаа → localStorage-д бүртгээд үргэлжлүүлнэ (алдагдахгүй ✓)
        const { list } = recordHistory(readLocal(), clean, now);
        writeLocal(list);
        return { ok: true, degraded: true };
      }
    }

    const { list } = recordHistory(readLocal(), clean, now);
    writeLocal(list);
    setItems(list.slice(0, SEARCH_HISTORY_LIMIT));
    return { ok: true };
  }, [userId]);

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

  const keySet = useMemo(() => new Set(items.map((it) => savedSearchKey(it.url))), [items]);

  return { items, loading, error, source, keySet, record, remove, clear };
}

