#!/usr/bin/env bash
# Inicia el microservicio privado de WhatsApp para Dystinta.
# Uso recomendado desde esta carpeta:
#   bash scripts/start.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker no esta instalado o no esta en PATH."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 no esta disponible. Instalar plugin docker compose."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "No existe .env. Creando .env desde .env.example para entorno local."
  cp .env.example .env
  echo "IMPORTANTE: editar .env y cambiar AUTHENTICATION_API_KEY y POSTGRES_PASSWORD antes de produccion."
fi

mkdir -p data/evolution data/postgres data/redis sessions logs webhooks

echo "Levantando Evolution API privado en 127.0.0.1:8080..."
docker compose up -d

echo
echo "Servicio iniciado."
echo "URL local: http://127.0.0.1:8080"
echo "Logs: bash scripts/logs.sh"
