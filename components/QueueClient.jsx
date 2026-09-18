'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth, useToast, useUI } from './AppProviders';
import { fetchDraftQueue } from '../lib/draftQueries';
import { normalizeError } from '../lib/errors';
import QueueDraftItem from './QueueDraftItem';

const TABS = [
  ['pending', '⏳ Хүлээж байна'],
  ['published', '📣 Нийтлэгдсэн'],
  ['rejected', '🗑 Татгалзсан'],
];

export default function QueueClient() {
  const { user, authLoading } = useAuth();
  const { openAuth } = useUI();
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState(null); // null = ачаалж байна
  const [tab, setTab] = useState('pending');

  const reload = useCallback(async () => {
    setDrafts(null);
    try {
      const data = await fetchDraftQueue('all');
      setDrafts(data || []);
    } catch (err) {
      console.error(normalizeError(err));
      setDrafts([]);
      showToast(err.message || 'Queue уншихад алдаа', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (user && drafts === null) reload();
    if (!user) setDrafts(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const counts = { pending: 0, published: 0, rejected: 0, approved: 0 };
  (drafts || []).forEach((d) => { if (counts[d.status] !== undefined) counts[d.status] += 1; });
  const list = tab === 'pending'
    ? (drafts || []).filter((d) => d.status === 'pending')
    : (drafts || []).filter((d) => d.status === tab);

  if (authLoading) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h3 className="mb-2 text-xl font-semibold">Агентын queue-г харахын тулд нэвтрэх шаардлагатай</h3>
          <button className="btn btn-primary mt-4" onClick={openAuth}>🔑 Нэвтрэх</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="mt-2 text-2xl font-bold">🤖 Facebook агентын queue</h1>
      <p className="form-hint mb-4">
        Facebook группээс цуглуулсан зарууд. Зарыг <strong>баталгаажуулан нийтлэхэд</strong> л үндсэн зарын жагсаалт руу орно.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            className={`btn btn-sm ${tab === value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(value)}
          >
            {label} {counts[value] > 0 && (
              <span className="ml-1 rounded-lg bg-white/25 px-1.5 text-xs">{counts[value]}</span>
            )}
          </button>
        ))}
      </div>

      {drafts === null ? (
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">📭</div>
          <h3 className="mb-2 text-xl font-semibold">Энэ хэсэгт зар алга</h3>
          <p className="text-gray-500">
            Демо өгөгдөл оруулах: <code className="rounded bg-gray-100 px-1.5 py-px text-xs">node scripts/ingest-fb-demo.js</code>
            <br />
            Эсвэл JSON-оос оруулах: <code className="rounded bg-gray-100 px-1.5 py-px text-xs">node scripts/ingest-from-json.js scripts/fb-dump.example.json</code>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((d) => (
            <QueueDraftItem key={d.id} draft={d} userId={user.id} onActionDone={reload} />
          ))}
        </div>
      )}
    </div>
  );
}
