'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth, useToast } from './AppProviders';
import { fetchProfile, updateProfile, uploadAvatar } from '../lib/queries';
import { compressImage } from '../lib/imageUtils';
import { normalizeError } from '../lib/errors';
import Avatar from './Avatar';

/**
 * 👤 ПРОФАЙЛ ЗАСАХ МОДАЛ
 *
 * • нэр (`profiles.display_name`) — зар болон нийтлэгчийн хуудсан дээр
 * НИЙТЭД харагдана. ⚠️ ЖИНХЭНЭ НЭР (`profiles.name`) нь ХАРАГДАХГҮЙ тул
 * хэрэглэгч нэрээ нууцалж чадна (0015_profiles_public.sql).
 * • ПРОФАЙЛ ЗУРАГ — `avatars` bucket. ⚠️ Зам нь `avatars/<user_id>/…` байх
 * ЁСТОЙ (Storage RLS нь эхний фолдерыг `auth.uid()`-тай харьцуулна).
 * • Зургийг `compressImage()`-ээр ЖИЖИГ (512px, ≤300KB) болгож байршуулна —
 * Storage хэмнэх + хурдан ачаалах.
 */
export default function ProfileModal({ open, onClose }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  // ⚠️ 0017: зар дээр нэр/зургаа нийтэд харуулах эсэх (opt-in)
  const [showIdentity, setShowIdentity] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // Одоогийн профайлыг ачаалах
  useEffect(() => {
    if (!open || !user || !user.id) return undefined;
    let mounted = true;
    setLoading(true);
    setError('');
    setFile(null);
    setPreview(null);
    (async () => {
      try {
        // ⚠️ ЗӨӨРИЙН профайлаа БҮРЭН уншина (`fetchProfile` → `select('*')`).
        //    `fetchProfilesByIds` нь `show_identity = false` үед нэр/зургийг
        //    ХООСОН буцаадаг (бусдын нүдээр) тул энд ТОХИРОХГҮЙ — эзэн
        //    өөрийн нэрээ харж, засах боломжтой байх ёстой.
        const p = await fetchProfile(user.id);
        if (!mounted) return;
        setDisplayName((p && (p.display_name || p.name)) || '');
        setAvatarUrl((p && p.avatar_url) || null);
        setShowIdentity(p?.show_identity === true);
      } catch (err) {
        if (mounted) setError(normalizeError(err).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, user]);

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearAvatar = () => {
    setFile(null);
    setPreview(null);
    setAvatarUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    if (!user || !user.id) return;
    setError('');
    const name = displayName.trim();
    if (name.length > 40) {
      setError('нэр хэт урт байна (40 тэмдэгт хүртэл).');
      return;
    }

    setSaving(true);
    try {
      let nextAvatar = avatarUrl;

      if (file) {
        const { file: small } = await compressImage(file, {
          maxDim: 512,
          quality: 0.82,
          maxBytes: 300 * 1024,
        });
        nextAvatar = await uploadAvatar(user.id, small);
      }

      await updateProfile(user.id, { displayName: name, avatarUrl: nextAvatar, showIdentity });

      setAvatarUrl(nextAvatar);
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      showToast('Профайл хадгалагдлаа ✅');
      onClose();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const shown = preview || avatarUrl;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-5">
      {/* ⚠️ ГАДНА ДАРАХАД ХААГДАХГҮЙ (хэрэглэгчийн хүсэлт, 2026-09-27):
          өмнө нь `onClick={onClose}` байсан тул хоч нэр/зураг засаж байхдаа
          санамсаргүй гадна дарвал цонх хаагдаж, БИЧСЭН ЗҮЙЛ АЛДАГДДАГ байв.
          Одоо зөвхөн «✕» эсвэл «← Болих» товчоор хаагдана ✓ */}
      <div
        className="w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-semibold">👤 Профайл</h2>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg transition hover:bg-gray-200"
            onClick={onClose}
            aria-label="Хаах"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">Ачаалж байна...</p>
          ) : (
            <>
              {/* ---------- ЗУРАГ ---------- */}
              <div className="mb-5 flex items-center gap-4">
                <Avatar src={shown} name={displayName} size={72} />
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    id="profile-avatar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={pickFile}
                  />
                  <label htmlFor="profile-avatar" className="btn btn-outline btn-sm cursor-pointer">
                    🖼 Зураг {shown ? 'солих' : 'оруулах'}
                  </label>
                  {shown && (
                    <button
                      type="button"
                      className="text-left text-[12px] font-semibold text-gray-500 hover:underline"
                      onClick={clearAvatar}
                    >
                      ✕ Зураг арилгах
                    </button>
                  )}
                  <p className="text-[11.5px] text-gray-400">
                    Автоматаар жижигрүүлж хадгална (≤300KB).
                  </p>
                </div>
              </div>

              {/* ---------- нэр ---------- */}
              <div className="mb-3 flex flex-col gap-1">
                <label className="mb-1 block text-[13px] font-semibold text-gray-700">
                  нэр <span className="font-normal text-gray-400">(зар дээр нийтэд харагдана)</span>
                </label>
                <input
                  className="form-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  placeholder="Жишээ: Бат-Үлэмж"
                />
                <p className="form-hint">
                  ⚠️ Таны <b>жинхэнэ нэр</b> хэзээ ч нийтэд харагдахгүй — зөвхөн энэ хоч
                  нэр зар болон «Нийтлэгчийн бусад зарууд» хуудсан дээр гарна.
                </p>
              </div>

              {/* ══════ НИЙТЭД ХАРУУЛАХ ЭСЭХ (0017_profile_identity.sql) ══════
                  ⚠️ Хэрэглэгч бүртгэлийн үед сонгосон тохиргоогоо ЭНД сольж
                     болно. `false` үед зар дээр нэр, зураг ОГТ харагдахгүй
                     (зөвхөн утасны дугаар).
                  ⚠️ нэрээ хоосон үлдээвэл — `show_identity = true` байсан ч
                     зар дээр нэр харагдахгүй (зураг л харагдана). */}
              <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 transition hover:border-primary/40">
                <input
                  type="checkbox"
                  checked={showIdentity}
                  onChange={(e) => setShowIdentity(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-[12.5px] leading-relaxed text-gray-600">
                  <b className="text-gray-800">Зар дээр нэр, зурагаа харуулах</b>
                  <br />
                  <b>☑ Тийм</b> — нэр ба зураг зарууд дээр харагдана.
                  <i> Агент, дэлгүүрүүд үүнийг нээдэг.</i>
                  <br />
                  <b>☐ Үгүй</b> — зөвхөн утасны дугаар харагдана (нэр, зураг харагдахгүй).
                </span>
              </label>

              {error && <p className="form-error">{error}</p>}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={saving}>
            ← Болих
          </button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || loading}>
            {saving ? 'Хадгалж байна...' : '💾 Хадгалах'}
          </button>
        </div>
      </div>
    </div>
  );
}
