# Integracion WhatsApp con Evolution API

Esta documentacion describe la integracion interna entre Django y Evolution API para mensajes automaticos de pedidos.

## Variables de entorno

Configurar en el entorno donde corre Django:

```env
EVOLUTION_API_URL=http://127.0.0.1:8080
EVOLUTION_API_KEY=clave-configurada-en-dystinta-whatsapp
EVOLUTION_INSTANCE_NAME=dystinta-main
EVOLUTION_API_TIMEOUT=15
```

`EVOLUTION_API_URL` debe usar localhost porque Evolution API es privado y no esta expuesto publicamente.

## Archivos principales

```text
orders/services/whatsapp_service.py
orders/views.py
orders/urls.py
orders/models.py
```

La logica de WhatsApp esta desacoplada en `orders/services/whatsapp_service.py`. Las views solo invocan el servicio.

## Envio automatico por estado

Cuando se crea un pedido, Django envia el mensaje de estado inicial.

Cuando el backoffice hace:

```text
PATCH /api/orders/<id>/
```

si el campo `status` cambio, Django envia automaticamente el mensaje correspondiente mediante Evolution API.

No se necesita boton "Enviar WhatsApp".

## Estados soportados para el nuevo flujo

```text
Nuevo
En revision
En diseno
Aprobacion cliente
Produccion
Finalizado
```

El backend conserva estados anteriores para no romper datos existentes:

```text
Archivo recibido
En cola
Imprimiendo
Listo para retirar
Entregado
En pausa
```

## Mensaje especial de aprobacion

Cuando el pedido pasa a:

```text
Aprobacion cliente
```

el cliente recibe:

```text
Hola {nombre}, tu diseno esta listo.

Responde:
1 para aprobar
2 para solicitar cambios.
```

## Webhook

Evolution API debe apuntar a:

```text
POST /api/whatsapp/webhook/
```

Si Evolution API corre en Docker y Django corre en el host del VPS, la URL desde el contenedor es:

```text
http://host.docker.internal:8000/api/whatsapp/webhook/
```

## Procesamiento de respuestas

El webhook:

1. Ignora mensajes enviados por la propia cuenta (`fromMe=true`).
2. Extrae telefono y texto.
3. Solo acepta respuestas que empiecen con `1` o `2`.
4. Busca el pedido mas reciente de ese telefono en estado `Aprobacion cliente`.
5. Si responde `1`, cambia el estado a `Produccion`.
6. Si responde `2`, cambia el estado a `En diseno`.
7. Agrega nota interna al pedido.
8. No envia otro WhatsApp desde el webhook para evitar loops.

## Probar envio manual desde Django shell

```bash
python manage.py shell
```

```python
from orders.models import Order
from orders.services.whatsapp_service import send_order_status_message

order = Order.objects.latest("id")
send_order_status_message(order)
```

## Probar cambio de estado

```bash
curl -X PATCH http://127.0.0.1:8000/api/orders/1/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -d '{"status":"Aprobacion cliente"}'
```

Si tu terminal usa UTF-8, enviar el valor con acentos reales:

```json
{"status":"Aprobación cliente"}
```

## Probar webhook de aprobacion

```bash
curl -X POST http://127.0.0.1:8000/api/whatsapp/webhook/ \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "dystinta-main",
    "data": {
      "key": {
        "remoteJid": "595981123456@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST-APPROVAL"
      },
      "message": {
        "conversation": "1"
      }
    }
  }'
```

Resultado esperado:

```json
{
  "processed": true,
  "action": "approved",
  "order_id": 1,
  "new_status": "Produccion"
}
```

Con acentos reales el estado devuelto es:

```text
Producción
```

## Probar webhook de rechazo

```bash
curl -X POST http://127.0.0.1:8000/api/whatsapp/webhook/ \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "dystinta-main",
    "data": {
      "key": {
        "remoteJid": "595981123456@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST-REJECT"
      },
      "message": {
        "conversation": "2 - cambiar color del logo"
      }
    }
  }'
```

Resultado esperado:

```json
{
  "processed": true,
  "action": "rejected",
  "order_id": 1,
  "new_status": "En diseno"
}
```

Con acentos reales:

```text
En diseño
```

## Logs

La integracion usa el logger de Python:

```python
logging.getLogger(__name__)
```

Eventos registrados:

- mensaje enviado,
- webhook recibido,
- cliente aprobo,
- cliente rechazo,
- respuesta invalida,
- pedido no encontrado,
- Evolution API caida,
- timeout.

## Seguridad

- Mantener Evolution API en `127.0.0.1:8080`.
- No exponer Evolution API con Nginx.
- No abrir puerto 8080 al publico.
- Guardar `EVOLUTION_API_KEY` fuera del repositorio.
- Usar una clave larga generada con `openssl rand -hex 32`.
- Agregar rate limiting antes de escalar envios masivos.
- Registrar mensajes para auditoria antes de automatizar volumen alto.

## Produccion futura

Antes de produccion:

- confirmar que Evolution API esta levantado en el VPS,
- confirmar que Django puede llamar `http://127.0.0.1:8080`,
- probar una instancia de WhatsApp real,
- validar que el webhook llega desde Docker a Django,
- respaldar sesiones de `dystinta-whatsapp/sessions`,
- respaldar base de datos de Evolution API,
- monitorear errores de envio y respuestas invalidas.

