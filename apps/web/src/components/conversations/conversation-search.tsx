'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Result = {
  id: string;
  contactName: string;
  contactEmail: string | null;
  inboxName: string;
};

type Props = {
  accountId: string;
  token: string;
  onSelect: (conversationId: string) => void;
};

export function ConversationSearch({ accountId, token, onSelect }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.search
        .conversations(accountId, q.trim(), token)
        .then((r) => setResults(r.results))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q, accountId, token]);

  return (
    <div className="relative px-3 py-2 border-b border-gray-100">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search conversations…"
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onMouseDown={() => {
                  onSelect(r.id);
                  setQ('');
                  setOpen(false);
                }}
              >
                <span className="font-medium text-gray-900">{r.contactName}</span>
                <span className="text-gray-400 text-xs block">
                  {r.contactEmail || r.inboxName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
