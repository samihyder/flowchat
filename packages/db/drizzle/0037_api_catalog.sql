-- Super-admin API observability catalog: rich-text usage notes per discovered API route

CREATE TABLE IF NOT EXISTS api_catalog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  method varchar(10) NOT NULL,
  description_html text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path, method)
);
