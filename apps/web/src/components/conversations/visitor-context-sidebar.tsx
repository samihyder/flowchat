'use client';

import { useEffect, useState } from 'react';
import { api, type VisitorContext } from '@/lib/api';

type Props = {
  accountId: string;
  conversationId: string;
  token: string;
};

export function VisitorContextSidebar({ accountId, conversationId, token }: Props) {
  const [ctx, setCtx] = useState<VisitorContext | null>(null);

  useEffect(() => {
    api.conversations
      .visitorContext(accountId, conversationId, token)
      .then((r) => setCtx(r.context))
      .catch(() => setCtx(null));
  }, [accountId, conversationId, token]);

  if (!ctx) {
    return (
      <aside className="hidden xl:flex w-64 shrink-0 border-l border-gray-200 bg-white p-4 text-sm text-gray-400">
        Loading visitor info…
      </aside>
    );
  }

  return (
    <aside className="hidden xl:flex w-64 shrink-0 border-l border-gray-200 bg-white flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Visitor</h3>
      </div>
      <dl className="p-4 space-y-3 text-sm">
        {ctx.pageUrl && (
          <div>
            <dt className="text-xs text-gray-400">Current page</dt>
            <dd className="text-gray-800 break-all">{ctx.pageUrl}</dd>
          </div>
        )}
        {ctx.referrer && (
          <div>
            <dt className="text-xs text-gray-400">Referrer</dt>
            <dd className="text-gray-800 break-all">{ctx.referrer}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-gray-400">Device</dt>
          <dd className="text-gray-800">{ctx.device} · {ctx.browser}</dd>
        </div>
        {ctx.ipAddress && (
          <div>
            <dt className="text-xs text-gray-400">IP</dt>
            <dd className="text-gray-800 font-mono text-xs">{ctx.ipAddress}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-gray-400">Visits</dt>
          <dd className="text-gray-800">{ctx.visitCount}</dd>
        </div>
        {Object.keys(ctx.preChatData).length > 0 && (
          <div>
            <dt className="text-xs text-gray-400 mb-1">Pre-chat</dt>
            {Object.entries(ctx.preChatData).map(([k, v]) => (
              <dd key={k} className="text-gray-800">
                <span className="text-gray-500">{k}:</span> {v}
              </dd>
            ))}
          </div>
        )}
        {ctx.pastChats.length > 1 && (
          <div>
            <dt className="text-xs text-gray-400 mb-1">Past chats</dt>
            <dd className="space-y-1">
              {ctx.pastChats.slice(0, 5).map((c) => (
                <p key={c.id} className="text-xs text-gray-600">
                  {c.status} · {new Date(c.createdAt).toLocaleDateString()}
                </p>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
