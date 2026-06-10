'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useWsStore, type VisitorOnlineEvent } from '@/store/ws';
import { playVisitorAlarm, setVisitorAlarmMuted, isVisitorAlarmMuted } from '@/lib/visitor-alarm';

/** Play siren when a visitor lands on a website widget (account-scoped WS event). */
export function useVisitorAlarm() {
  const { accountId } = useAuthStore();
  const { lastVisitorEvent, visitorEventSeq } = useWsStore();
  const lastSeq = useRef(0);
  const [alert, setAlert] = useState<VisitorOnlineEvent | null>(null);
  const [muted, setMuted] = useState(isVisitorAlarmMuted);

  useEffect(() => {
    if (!lastVisitorEvent || !accountId) return;
    if (visitorEventSeq === lastSeq.current) return;
    lastSeq.current = visitorEventSeq;
    if (lastVisitorEvent.accountId !== accountId) return;
    setAlert(lastVisitorEvent);
    playVisitorAlarm();
    const t = setTimeout(() => setAlert(null), 8000);
    return () => clearTimeout(t);
  }, [visitorEventSeq, lastVisitorEvent, accountId]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setVisitorAlarmMuted(next);
  };

  return { alert, muted, toggleMute };
}
