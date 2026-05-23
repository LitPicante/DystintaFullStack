#!/usr/bin/env bash
# Muestra logs en vivo de Evolution API, Postgres y Redis.
# Uso:
#   bash scripts/logs.sh
#   bash scripts/logs.sh evolution-api

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVICE_NAME="${1:-}"

cd "${PROJECT_DIR}"

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 no esta disponible."
  exit 1
fi

if [ -n "${SERVICE_NAME}" ]; then
  echo "Mostrando logs del servicio: ${SERVICE_NAME}"
  docker compose logs -f --tail=200 "${SERVICE_NAME}"
else
  echo "Mostrando logs de todos los servicios de dystinta-whatsapp."
  docker compose logs -f --tail=200
fi
