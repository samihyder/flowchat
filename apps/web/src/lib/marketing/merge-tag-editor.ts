/** Parse `{{first_name}}` → `first_name`. */
export function parseMergeTagKey(tag: string): string | null {
  const m = tag.match(/^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/);
  return m ? m[1]! : null;
}

export function mergeTagToken(key: string): string {
  return `{{${key}}}`;
}

const CHIP_CLASS =
  'merge-tag-chip bg-primary-surface border border-primary-border rounded px-1.5 font-data-mono text-primary text-[13px] mx-0.5';

/** Storage HTML (`{{tags}}`) → editor HTML with inline chips. */
export function storageHtmlToEditorHtml(html: string): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return `<span data-merge-tag="${key}" class="${CHIP_CLASS}" contenteditable="false">${key}</span>`;
  });
}

/** Editor HTML with chip spans → storage `{{tags}}`. */
export function editorHtmlToStorageHtml(html: string): string {
  return html
    .replace(/<span[^>]*data-merge-tag="([^"]+)"[^>]*>[\s\S]*?<\/span>/gi, (_, key: string) =>
      mergeTagToken(key)
    )
    .replace(/<merge-tag[^>]*data-key="([^"]+)"[^>]*><\/merge-tag>/gi, (_, key: string) =>
      mergeTagToken(key)
    );
}
