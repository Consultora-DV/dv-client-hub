# 🔔 Activar las notificaciones push (guía paso a paso)

> El código ya está listo y subido. Faltan **3 pasos manuales** que solo se
> pueden hacer desde tu cuenta de Supabase. Toman ~10 minutos. Hazlos en orden.
>
> Cuando termines, podrás: instalar el panel como app en tu celular y recibir
> un aviso **al instante** cada vez que un editor suba un video — **aunque
> tengas la app cerrada**. Y los editores recibirán aviso cuando apruebes o
> pidas cambios.

---

## ✅ Resumen de lo que ya quedó hecho (no tienes que tocar nada de esto)
- App instalable en el celular (PWA): manifest, ícono dorado “DV”, service worker.
- Botón “Activar notificaciones” en la campana 🔔, en tu perfil y en la bandeja de admin.
- Edge function `send-push` (envía las notificaciones).
- Migración SQL `20260622000000_push_and_notifications.sql` (tabla de dispositivos + triggers).
- Se conectó el push a: subir entrega, cambiar status, marcar pagado, asignar cliente.

---

## PASO 1 — Correr el SQL (crea la tabla y los triggers)

Esto es **lo más importante**: es la causa #1 de que antes “no pasara nada”.

1. Entra a **Supabase → tu proyecto → SQL Editor → New query**.
2. Abre el archivo del repo: `supabase/migrations/20260622000000_push_and_notifications.sql`.
3. Copia **todo** su contenido, pégalo en el editor y dale **Run**.
4. Debe decir *Success*. Para confirmar que los triggers quedaron, corre esto:

```sql
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_notify%';
```

Deberías ver **3 filas**: `trg_notify_video_created`, `trg_notify_video_updated`, `trg_notify_editor_assigned`.
Si ves las 3, las notificaciones **dentro de la app** ya van a funcionar.

---

## PASO 2 — Poner los secrets del push (las llaves VAPID)

1. Entra a **Supabase → Edge Functions → Secrets** (o *Project Settings → Edge Functions*).
2. Agrega estos **3 secrets** (botón *Add new secret*), exactamente con estos nombres y valores:

| Nombre | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | `BHihtiSE_-lTRC17yClj20-yzTc1xKwWshmngOKJqXKrHmn3nay7xJ5c5gEverQhvRl8x-ECPX5f9wWufFYLn_Y` |
| `VAPID_PRIVATE_KEY` | ⚠️ **(secreto — te lo paso en el chat, NO se guarda en el repo)** |
| `VAPID_SUBJECT` | `mailto:adantevele@gmail.com` |

> ⚠️ La `VAPID_PRIVATE_KEY` es un secreto y por eso **no** está escrita aquí (no se
> guarda en el repositorio). El valor te lo di en el mensaje del chat. La pública
> sí puede ser visible (ya está en `src/config/push.ts`).
>
> **¿Perdiste la llave privada?** Genera un par nuevo y pega ambos valores (en los
> secrets de Supabase la privada+pública, y la pública también en
> `src/config/push.ts` — deben coincidir):
> ```bash
> node -e 'const c=require("crypto");const{publicKey,privateKey}=c.generateKeyPairSync("ec",{namedCurve:"prime256v1"});const j=privateKey.export({format:"jwk"});const b=s=>Buffer.from(s,"base64url");const pub=Buffer.concat([Buffer.from([4]),b(j.x),b(j.y)]);const u=x=>x.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");console.log("PUBLIC =",u(pub));console.log("PRIVATE=",u(b(j.d)))'
> ```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen automáticamente, no los toques.

---

## PASO 3 — Desplegar la función `send-push`

Lovable normalmente despliega solo las funciones que están en `supabase/functions/`
cuando sincroniza el repo. Para asegurarte:

- **Opción A (Lovable):** sincroniza/despliega el proyecto como siempre. Verifica
  en **Supabase → Edge Functions** que aparezca `send-push` en la lista.
- **Opción B (terminal, si tienes el CLI):**
  ```bash
  supabase functions deploy send-push
  ```

> Mientras `send-push` no esté desplegada, la app **igual funciona** y las
> notificaciones dentro de la app aparecen (gracias al Paso 1). Solo el aviso al
> celular con la app cerrada espera a este paso.

---

## 🧪 Probar que todo jala

1. Abre el panel en tu celular: `https://dv-client-hub-claudecode.vercel.app`
2. (Recomendado) Instálalo: en **iPhone** → Safari → Compartir → *Agregar a inicio*.
   En **Android** → Chrome te ofrecerá *Instalar app*.
3. Abre la app, toca la **campana 🔔** → **“Activar notificaciones en este dispositivo”**
   y acepta el permiso. (También está en *Mi perfil* y en la bandeja de admin.)
4. En la tarjeta de notificaciones, toca **“Enviar prueba”**. Debe llegarte una
   notificación en segundos. ✅
5. Prueba real: pide a un editor que suba una entrega → te debe llegar el aviso.

### iPhone — importante
En iPhone el push **solo funciona si instalaste la app** (“Agregar a inicio”) y la
abres desde ese ícono. En el Safari normal, Apple no permite push. Requiere iOS 16.4+.

---

## ❓ Si algo no llega
- **No llega nada dentro de la app:** revisa el Paso 1 (los 3 triggers). Es la causa más común.
- **Llega dentro de la app pero no al celular cerrado:** revisa Pasos 2 y 3 (secrets + función desplegada).
- **“Enviar prueba” dice que no hay dispositivos:** vuelve a tocar “Activar” (a veces el permiso quedó en *default*).
- **Emails de resumen fallan:** eso es la otra función (`send-notification-digest`) — revisa el secret `RESEND_API_KEY`.
