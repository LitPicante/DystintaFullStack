#!/usr/bin/env bash
# Detiene los contenedores del microservicio WhatsApp sin borrar datos.
# No elimina sesiones, base de datos, logs ni volumenes montados en ./data.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_DIR}"

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 no esta disponible."
  exit 1
fi

echo "Deteniendo Evolution API privado..."
docker compose down

echo "Servicio detenido. Los datos persistentes permanecen en ./data y ./sessions."
