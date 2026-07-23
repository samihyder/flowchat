'use client';

import { DocumentsNav } from '@/components/documents/documents-nav';

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="documents-module flex flex-col h-full min-h-0 bg-gradient-to-b from-primary-50/80 via-slate-50 to-slate-100 animate-fade-in">
      <DocumentsNav />
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">{children}</div>
    </div>
  );
}
