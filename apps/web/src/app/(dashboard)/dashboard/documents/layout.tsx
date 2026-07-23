'use client';

import { DocumentsNav } from '@/components/documents/documents-nav';

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 bg-gray-50 animate-fade-in">
      <DocumentsNav />
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col bg-gray-50">
        {children}
      </div>
    </div>
  );
}
