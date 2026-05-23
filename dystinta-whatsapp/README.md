# Dystinta WhatsApp - Evolution API privado

Este directorio prepara un microservicio interno de WhatsApp basado en Evolution API para el proyecto Dystinta. Esta carpeta esta pensada para vivir aislada dentro de `DystintaFullStack` y poder moverse completa a un VPS Ubuntu sin cambiar la estructura.

No contiene logica de negocio, no modifica Django y no modifica React. Solo deja lista la infraestructura inicial para usar Evolution API como servicio privado/local.

## Objetivo

Preparar una base profesional para que, mas adelante, el backend Django pueda:

- enviar mensajes automaticos por WhatsApp,
- recibir respuestas mediante webhooks internos,
- mantener sesiones persistentes,
- procesar respuestas simples del cliente, por ejemplo `1` para aprobar y `2` para pedir cambios,
- trabajar sin exponer Evolution API publicamente.

## Arquitectura

```text
Internet
   ↓
Nginx
   ↓
Django Backend publico
   ↓
Evolution API Dockerizado privado/local
```

Evolution API escucha en:

```text
http://127.0.0.1:8080
```

El puerto se publica con este formato en `docker-compose.yml`:

```yaml
127.0.0.1:8080:8080
```

Eso significa que el servicio queda disponible solo desde la propia maquina. No queda abierto hacia Internet.

## Que es Evolution API

Evolution API es una API HTTP para operar sesiones de WhatsApp mediante una instancia conectada por QR. Permite crear una instancia, conectar una cuenta de WhatsApp, enviar mensajes, recibir eventos y configurar webhooks para notificar al backend cuando ocurre algo relevante.

En este proyecto se usa como un microservicio privado. Django sera el unico consumidor futuro de esta API. Nginx no debe apuntar a Evolution API, no se debe crear un subdominio y no se debe habilitar HTTPS directo para este servicio.

Documentacion de referencia:

- Docker: https://doc.evolution-api.com/v2/en/install/docker
- Variables de entorno: https://doc.evolution-api.com/v2/en/env
- Repositorio/compose oficial: https://github.com/evolution-foundation/evolution-api

## Estructura

```text
dystinta-whatsapp/
├── docker-compose.yml
├── .env.example
├── README.md
├── data/
│   └── .gitkeep
├── sessions/
│   └── .gitkeep
├── logs/
│   └── .gitkeep
├── webhooks/
│   └── example-payloads.json
└── scripts/
    ├── start.sh
    ├── stop.sh
    └── logs.sh
```

## Servicios Docker

El `docker-compose.yml` levanta tres servicios:

- `evolution-api`: API privada de WhatsApp.
- `postgres`: base de datos interna para persistencia.
- `redis`: cache interno para Evolution API.

Solo `evolution-api` publica puerto, y lo hace exclusivamente en `127.0.0.1`.

Postgres y Redis no publican puertos. Solo existen dentro de la red Docker privada.

## Requisitos en Ubuntu

Instalar Docker y Docker Compose v2:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
```

Seguir la guia oficial de Docker para Ubuntu si el VPS todavia no tiene Docker instalado:

```text
https://docs.docker.com/engine/install/ubuntu/
```

Verificar:

```bash
docker --version
docker compose version
```

## Primer uso local o VPS

Entrar a la carpeta:

```bash
cd DystintaFullStack/dystinta-whatsapp
```

Crear `.env`:

```bash
cp .env.example .env
```

Editar valores sensibles:

```bash
nano .env
```

Cambiar como minimo:

```env
AUTHENTICATION_API_KEY=dystinta-local-change-this-64-char-secret-key-2026
POSTGRES_PASSWORD=dystinta-postgres-change-this-password-2026
DATABASE_CONNECTION_URI=postgresql://evolution:dystinta-postgres-change-this-password-2026@postgres:5432/evolution?schema=public
```

Generar una clave fuerte:

```bash
openssl rand -hex 32
```

Levantar:

```bash
docker compose up -d
```

Tambien se puede usar el script:

```bash
bash scripts/start.sh
```

Ver estado:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs -f --tail=200
```

O con script:

```bash
bash scripts/logs.sh
```

Detener sin borrar datos:

```bash
docker compose down
```

O con script:

```bash
bash scripts/stop.sh
```

## Scripts

`scripts/start.sh`

- valida Docker,
- valida Docker Compose v2,
- crea `.env` desde `.env.example` si no existe,
- crea carpetas persistentes,
- ejecuta `docker compose up -d`.

`scripts/stop.sh`

- ejecuta `docker compose down`,
- no borra `data/`, `sessions/` ni `logs/`.

`scripts/logs.sh`

- muestra logs de todos los servicios,
- permite filtrar por servicio:

```bash
bash scripts/logs.sh evolution-api
bash scripts/logs.sh postgres
bash scripts/logs.sh redis
```

Para hacerlos ejecutables en Ubuntu:

```bash
chmod +x scripts/*.sh
```

## Como abrir Evolution API localmente

Desde el VPS o desde tu maquina local:

```text
http://127.0.0.1:8080
```

Si trabajas en un VPS remoto, no expongas el puerto publicamente. Para acceder temporalmente desde tu PC, usar tunel SSH:

```bash
ssh -L 8080:127.0.0.1:8080 usuario@IP_DEL_VPS
```

Luego abrir en tu navegador local:

```text
http://127.0.0.1:8080
```

Este tunel es temporal y seguro porque no abre el puerto al mundo.

## Como escanear QR y conectar WhatsApp

El flujo general de Evolution API es:

1. Crear una instancia, por ejemplo `dystinta-main`.
2. Solicitar conexion o QR para esa instancia.
3. Abrir WhatsApp en el telefono.
4. Ir a dispositivos vinculados.
5. Escanear el QR.
6. Verificar en Evolution API que la instancia quedo conectada.

Los endpoints exactos pueden variar entre versiones de Evolution API, pero el patron habitual es:

```bash
curl -X POST http://127.0.0.1:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: TU_API_KEY" \
  -d '{
    "instanceName": "dystinta-main",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

Conectar o recuperar QR:

```bash
curl -X GET http://127.0.0.1:8080/instance/connect/dystinta-main \
  -H "apikey: TU_API_KEY"
```

Consultar estado:

```bash
curl -X GET http://127.0.0.1:8080/instance/connectionState/dystinta-main \
  -H "apikey: TU_API_KEY"
```

Si el QR no aparece en pantalla, revisar logs:

```bash
bash scripts/logs.sh evolution-api
```

## Ejemplo de envio de mensaje

Ejemplo HTTP directo desde el VPS:

```bash
curl -X POST http://127.0.0.1:8080/message/sendText/dystinta-main \
  -H "Content-Type: application/json" \
  -H "apikey: TU_API_KEY" \
  -d '{
    "number": "595981123456",
    "text": "Hola, tu pedido Dystinta paso a revision. Responde 1 para aprobar o 2 para solicitar cambios."
  }'
```

La URL usa `127.0.0.1` porque Django y Evolution API viviran en la misma maquina.

## Ejemplo futuro desde Django

No se implementa nada en Django todavia. Este ejemplo solo documenta el uso futuro:

```python
import requests
from django.conf import settings

def send_whatsapp_text(number, text):
    url = "http://127.0.0.1:8080/message/sendText/dystinta-main"
    headers = {
        "apikey": settings.EVOLUTION_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "number": number,
        "text": text,
    }
    response = requests.post(url, json=payload, headers=headers, timeout=15)
    response.raise_for_status()
    return response.json()
```

Variables futuras sugeridas en Django:

```env
EVOLUTION_API_URL=http://127.0.0.1:8080
EVOLUTION_API_KEY=misma-clave-del-env-de-dystinta-whatsapp
EVOLUTION_INSTANCE_NAME=dystinta-main
```

## Webhooks internos

El `.env.example` define:

```env
WEBHOOK_GLOBAL_ENABLED=true
WEBHOOK_GLOBAL_URL=http://host.docker.internal:8000/api/whatsapp/webhook/
WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=true
```

Desde un contenedor Docker, `127.0.0.1` apunta al propio contenedor, no al host. Por eso se usa:

```text
host.docker.internal
```

En `docker-compose.yml` se agrega:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

Esto permite que Evolution API llame al Django que corre en el host.

Cuando Django tambien este dockerizado en el futuro, se podra cambiar la URL del webhook para apuntar al nombre del servicio Docker de Django, por ejemplo:

```env
WEBHOOK_GLOBAL_URL=http://django:8000/api/whatsapp/webhook/
```

## Ejemplo futuro de webhook en Django

No crear todavia. Solo referencia futura:

```python
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def whatsapp_webhook(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    payload = json.loads(request.body.decode("utf-8"))
    event = payload.get("event")
    instance = payload.get("instance")
    data = payload.get("data", {})

    # Futuro:
    # - validar token interno
    # - guardar evento crudo
    # - detectar mensaje recibido
    # - si texto == "1", aprobar pedido
    # - si texto empieza con "2", marcar cambios solicitados

    return JsonResponse({"ok": True, "event": event, "instance": instance})
```

## Payloads de ejemplo

El archivo:

```text
webhooks/example-payloads.json
```

Incluye ejemplos simulados de:

- mensaje recibido,
- mensaje enviado,
- respuesta del cliente aprobando con `1`,
- respuesta del cliente rechazando con `2`,
- delivery,
- read receipt.

Estos ejemplos sirven para disenar luego el endpoint Django sin depender de WhatsApp real durante el desarrollo.

## Flujo futuro de mensajes

1. Admin o designer cambia el estado de un pedido en Django.
2. Django decide si debe notificar al cliente.
3. Django llama a Evolution API:

```text
POST http://127.0.0.1:8080/message/sendText/dystinta-main
```

4. Evolution API envia WhatsApp al cliente.
5. Cliente responde `1` o `2`.
6. Evolution API recibe el mensaje.
7. Evolution API llama webhook interno:

```text
POST http://host.docker.internal:8000/api/whatsapp/webhook/
```

8. Django procesa la respuesta y cambia el pedido.

## Mantener Evolution API privado

Reglas importantes:

- No crear subdominio para Evolution API.
- No configurar Nginx hacia Evolution API.
- No crear certificado HTTPS para Evolution API.
- No cambiar `127.0.0.1:8080:8080` por `8080:8080`.
- No usar `EVOLUTION_BIND_HOST=0.0.0.0`.
- No abrir puerto 8080 en firewall.
- Usar tunel SSH para administracion remota temporal.

Verificar que el puerto no esta expuesto externamente:

```bash
sudo ss -tulpn | grep 8080
```

Debe verse ligado a `127.0.0.1`, no a `0.0.0.0`.

## Firewall recomendado en VPS

Ejemplo con UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 8080/tcp
sudo ufw enable
sudo ufw status verbose
```

Aunque Docker publique en localhost, negar 8080 en firewall agrega una capa adicional.

## Backups

Respaldar periodicamente:

```text
dystinta-whatsapp/sessions/
dystinta-whatsapp/data/postgres/
dystinta-whatsapp/data/redis/
dystinta-whatsapp/.env
```

Ejemplo simple:

```bash
tar -czf dystinta-whatsapp-backup-$(date +%F).tar.gz \
  dystinta-whatsapp/.env \
  dystinta-whatsapp/sessions \
  dystinta-whatsapp/data
```

Recomendaciones:

- guardar backups fuera del VPS,
- cifrar backups que incluyan `.env`,
- probar restauracion en entorno de staging,
- no versionar `.env`,
- no subir sesiones a repositorios publicos.

## Actualizaciones

Para actualizar la imagen:

```bash
docker compose pull
docker compose up -d
```

En produccion conviene fijar version:

```env
EVOLUTION_API_IMAGE=evoapicloud/evolution-api:v2.3.0
```

Antes de actualizar:

```bash
bash scripts/stop.sh
tar -czf backup-before-evolution-update-$(date +%F).tar.gz .env sessions data
docker compose pull
docker compose up -d
```

## Buenas practicas para evitar bloqueos de WhatsApp

WhatsApp puede limitar o bloquear cuentas si detecta automatizacion agresiva, spam o comportamiento no humano.

Buenas practicas:

- usar una linea autorizada por la empresa,
- enviar mensajes solo a clientes que iniciaron relacion comercial,
- evitar envios masivos sin consentimiento,
- no mandar muchos mensajes iguales en poco tiempo,
- incluir contexto del pedido en cada mensaje,
- responder a interacciones reales del cliente,
- respetar horarios razonables,
- implementar rate limiting desde Django antes de enviar,
- registrar cada envio para auditoria,
- permitir que el cliente pida no recibir mas mensajes.

Para produccion, preferir mensajes transaccionales:

- confirmacion de pedido,
- cambio de estado,
- solicitud de aprobacion,
- aviso de retiro/entrega,
- respuesta a consulta iniciada por el cliente.

## Separacion dev/prod

Mantener `.env` distintos:

- desarrollo local: clave local, instancia de prueba, numero de prueba,
- staging: instancia separada, base separada,
- produccion: clave fuerte, numero oficial, backups activos.

No reutilizar sesiones de produccion para pruebas.

## Variables principales

`SERVER_URL`

URL que Evolution API usa para referencias internas. En esta arquitectura:

```env
SERVER_URL=http://127.0.0.1:8080
```

`AUTHENTICATION_API_KEY`

Clave para autorizar requests HTTP. Django debera enviar esta clave en header `apikey`.

`CONFIG_SESSION_PHONE_CLIENT`

Nombre visible del cliente/dispositivo vinculado.

`DATABASE_ENABLED`

Activa persistencia con base de datos.

`DATABASE_CONNECTION_URI`

Conexion interna a Postgres.

`WEBHOOK_GLOBAL_ENABLED`

Activa webhooks globales.

`WEBHOOK_GLOBAL_URL`

URL interna donde Evolution API enviara eventos a Django.

`WEBSOCKET_ENABLED`

Desactivado inicialmente porque no se necesita WebSocket para el flujo actual.

`CORS_ORIGIN`

Origenes permitidos. Como Evolution API no es publico, se restringe a origenes locales.

`TZ`

Timezone:

```env
TZ=America/Asuncion
```

## Prueba rapida

Desde `dystinta-whatsapp`:

```bash
cp .env.example .env
bash scripts/start.sh
docker compose ps
bash scripts/logs.sh evolution-api
```

Probar API local:

```bash
curl http://127.0.0.1:8080
```

Crear instancia:

```bash
curl -X POST http://127.0.0.1:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: dystinta-local-change-this-64-char-secret-key-2026" \
  -d '{"instanceName":"dystinta-main","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'
```

Revisar QR/logs:

```bash
bash scripts/logs.sh evolution-api
```

## Notas finales

Esta carpeta deja la infraestructura lista, privada y desacoplada. El siguiente paso futuro sera implementar en Django:

- variables de entorno para Evolution API,
- cliente HTTP interno,
- endpoint de webhook,
- validacion de seguridad del webhook,
- tabla/log de eventos WhatsApp,
- reglas de negocio para aprobacion/rechazo de pedidos.

Nada de eso esta incluido aqui por decision de arquitectura: esta etapa es solo infraestructura/configuracion inicial.
