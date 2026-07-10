import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.join(__dirname, '..', 'src', 'app', 'api');
const OUT_DIR = path.join(__dirname, '..', 'src', 'lib', 'admin');
const OUT_FILE = path.join(OUT_DIR, 'api-routes.generated.json');

const METHOD_RE = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g;

function toUrlPath(base) {
  return `/api${base}` || '/api';
}

function walk(dir, base, out) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, `${base}/${entry}`, out);
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      const content = readFileSync(full, 'utf8');
      const methods = [...content.matchAll(METHOD_RE)].map((m) => m[1]);
      if (!methods.length) continue;
      out.push({
        path: toUrlPath(base),
        methods: [...new Set(methods)].sort(),
        filePath: path.relative(path.join(__dirname, '..', '..', '..'), full).replace(/\\/g, '/'),
      });
    }
  }
}

const routes = [];
walk(API_ROOT, '', routes);
routes.sort((a, b) => a.path.localeCompare(b.path));

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(routes, null, 2) + '\n');

console.log(`Generated ${routes.length} API route entries -> ${path.relative(process.cwd(), OUT_FILE)}`);
