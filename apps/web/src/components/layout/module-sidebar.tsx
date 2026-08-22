'use client';

import Link from 'next/link';
import type { Route } from 'next';

export type ModuleNavItem = {
  label: string;
  href: Route | string;
  icon: string;
  badge?: number;
};

export type ModuleNavSection = {
  label: string;
  items: ModuleNavItem[];
};

/**
 * Shared vertical section-nav used by secondary/sub-module shells (Settings, Marketing).
 * Grouped by category, single column, one clean click target per row.
 */
export function ModuleSidebar({
  sections,
  isActive,
  onNavigate,
}: {
  sections: ModuleNavSection[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Section navigation">
      {sections.map((section, i) => (
        <div key={section.label} className={i > 0 ? 'mt-6' : ''}>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 select-none">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(item.href as string);
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  onClick={onNavigate}
                  className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150 ${
                    active
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[19px] w-5 text-center shrink-0 ${
                      active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
