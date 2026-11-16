#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f backend/.env ]]; then cp backend/.env.example backend/.env; echo 'Configura backend/.env (JWT_SECRET y GROQ_API_KEY)'; exit 1; fi
docker compose up -d db
npm install
npm run db:migrate
npm run dev
