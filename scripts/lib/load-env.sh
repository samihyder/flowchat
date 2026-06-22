#!/usr/bin/env bash
# Load KEY=value pairs from repo .env without bash "source" parse issues (e.g. angle brackets).
load_repo_env() {
  local file="${1:-.env}"
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
      if [[ "$val" == \"*\" ]]; then val="${val:1:${#val}-2}"; fi
      if [[ "$val" == \'*\' ]]; then val="${val:1:${#val}-2}"; fi
      export "$key=$val"
    fi
  done <"$file"
}
