import type { ReactNode } from 'react';

export function SettingsPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

export function SettingsCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>}
      {children}
    </div>
  );
}

export function AnnotationBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900">
      <span aria-hidden className="shrink-0">
        ★
      </span>
      <div>{children}</div>
    </div>
  );
}

export function SettingsFormActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 mt-4">{children}</div>;
}
