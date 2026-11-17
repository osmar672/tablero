#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Instala Node.js 22.16 o superior'; exit 1; }
command -v docker >/dev/null || { echo 'Instala Docker Engine con Compose'; exit 1; }
npm run setup:env
docker compose up -d --wait db
npm ci
npm run db:migrate
npm run dev
