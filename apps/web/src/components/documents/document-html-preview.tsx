'use client';

/** Sandboxed HTML preview — scripts disabled. */
export function DocumentHtmlPreview({
  html,
  className = '',
  title = 'Document preview',
}: {
  html: string;
  className?: string;
  title?: string;
}) {
  return (
    <iframe
      title={title}
      sandbox=""
      srcDoc={html}
      className={`w-full min-h-[280px] rounded-xl border border-gray-200 bg-white ${className}`}
    />
  );
}
