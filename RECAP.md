# RECAP — dv-client-hub (Panel Consultora DV)

> Documento de continuidad. Última actualización: 2026-05-23.
> Producción: https://dv-client-hub-claudecode.vercel.app
> Repo: Consultora-DV/dv-client-hub · Stack: React + Vite + TanStack + Supabase + Vercel (sync vía Lovable)

---

## 🎯 QUÉ ES ESTE PANEL

Dos portales en una misma app, separados por rol (Supabase Auth + `user_roles`):

1. **Portal Cliente** (rol `cliente`): el cliente ve sus videos, documentos, calendario, métricas, Meta Ads.
2. **Portal Editor** (rol `editor`): el editor sube entregas de video, ve su cola, su esquema de pago.
3. **Admin** (rol `admin` — Dante): ve todo, gestiona entregas, usuarios, asignaciones, envía avisos.

Clientes reales: **Dra. Fedra Aldama, Dra. Ale Paz, Bianca Aldama Boutique, The Skin Club.**
Editores en prueba: **Cesar, Alejandro Vega (dantevega95@hotmail.com), Editor DANTE (motocicleta_98@hotmail.com).**

---

## ✅ LO QUE SE CONSTRUYÓ (funcional)

### 1. Caché Meta Ads en Supabase
- Tabla `meta_ads_cache` + `metaAdsCacheService.ts`. TTLs: insights 45min, daily 4h, campaigns/adsets 90min, creatives 6h, ad_detail 12h.
- Botón "Actualizar" limpia caché; auto-refresh usa caché. Badge de antigüedad en header de AdsPage.
- Protección rate-limit Meta (código 4, headers x-business-use-case-usage).

### 2. Portal Editor (feature central)
- **Sistema REC**: `rec_number` + `rec_order` → display "R3-02" (antes era TANDA/T, se cambió a REC/R).
- Tabla `videos` extendida: `rec_number, rec_order, editor_id, editor_name, priority, referencia_guion, link_publicado, costo, moneda, pagado, published_at, categoria (0-4)`.
- **Categoría 0-4**: el editor la elige al subir (botones grandes, obligatorio).
- Input REC de texto único (parsea "R3-02", "R3 02", "3-02").
- Estados: `pending → in_review → approved/changes → published`. Editor sube → queda `in_review`.
- Editor puede **editar/borrar** sus entregas mientras estén `in_review` (RLS).
- `EditorLayout`, `EditorDashboardPage`, `NuevaEntregaPage`.
- Routing por rol: login de editor → `/editor/dashboard`. Guard `NotEditorRoute` saca a editores del portal cliente.

### 3. Admin — Entregas (`/admin/entregas`)
- CRUD completo, edición inline (status, prioridad, costo, pagado, categoría).
- Filtros como dropdowns: cliente, estado, pago, ordenar + avanzados (REC, editor, mes, categoría) + búsqueda por texto.
- Totales USD/MXN con desglose de pendiente.
- **Import CSV** (`ImportEntregasModal` + `notionCsvImport.ts`): genérico, selector de cliente, parsea export de Notion.
- Histórico de Fedra importado (~45 videos REC 1-6).

### 4. Preferencias de editor (`editor_preferences`)
- Esquemas de pago: `per_video / fixed_monthly / fixed_weekly / fixed_biweekly / none`.
- Flags de visibilidad: `show_costo, show_referencia, show_publicado, show_thumbnail, show_embed`.
- `EditorConfigPanel` (⚙️ en `/usuarios`): admin asigna clientes con checkboxes + define pago + visibilidad. **Sin SQL.**
- Si el editor es pago fijo, NO ve el campo "costo por video" (triple blindaje).

### 5. Perfil personalizable
- `profiles` + `social_links (jsonb), phone, bio`.
- `ProfileModal`: foto (Supabase Storage `avatars`), nombre, email, teléfono, bio, redes (IG/TikTok/FB/Twitter/web), cambio de contraseña.
- Editor accede vía botón "Mi perfil" en header de `EditorLayout`.

### 6. Pantalla post-registro
- Tras signup → pantalla "¡Casi listo!" con 4 pasos (revisa correo, confirma, login, espera aprobación).

---

## ⚠️ SISTEMA DE NOTIFICACIONES — CONSTRUIDO PERO **NO FUNCIONA EN LA PRÁCTICA**

> **ESTE ES EL PROBLEMA #1. El editor sube contenido y al admin no le llega nada.**

Lo que se programó:
- 3 triggers Postgres (`notify_video_created`, `notify_video_updated`, `notify_editor_assigned`) que insertan en `notifications`.
- `notifications` + `email_sent, email_sent_at, metadata, actor_id`.
- `NotificationBell`: realtime, toast con X, desktop notifications (Browser API), banner de permiso.
- `desktopNotifications.ts`.
- `/admin/notificaciones`: bandeja de envío manual de email digest (agrupa por usuario, botón "Enviar email").
- Edge function `send-notification-digest` (Resend). Dominio verificado: `send.dantemvp.com`.

### 🔴 SOSPECHAS DE POR QUÉ NO FUNCIONA (verificar primero al retomar):
1. **Los triggers SQL probablemente NUNCA se corrieron con éxito** en la DB (la migración `20260510060000` se dio en chat pero hubo errores de SQL en intentos previos). → Verificar: `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_notify%';`
2. **Edge function `send-notification-digest`: "Failed to send a request to the Edge Function"** — nunca se resolvió. Puede no estar desplegada/llamable. Lovable dijo que "ya existe" pero quizá no está activa.
3. Secrets Resend en Supabase: `RESEND_API_KEY` (⚠️ ROTAR — se compartió en chat), `RESEND_FROM` (debe ser `DV Hub <noreply@send.dantemvp.com>`), `APP_URL`.

---

## 🐛 OTROS BUGS CONOCIDOS SIN RESOLVER
- **`delete-user` edge function rota**: "Failed to send a request" al eliminar usuarios. Preexistente.
- **Filtro de editor en Entregas**: solo muestra editores que YA tienen videos (deriva de `editor_name`). Un editor nuevo sin entregas no aparece. Confuso para el admin.
- **Vercel "This deployment is temporarily paused"** — revisar dashboard de Vercel (billing/pausa manual).
- **Sidebar cliente muestra `Videos (766)`**: conteo global, debería ser por cliente.

---

## 🔐 PENDIENTE DE AUDITORÍA (próximo paso al retomar)
Revisar a fondo: funcionalidad end-to-end, RLS de TODAS las tablas, edge functions, fugas de datos entre roles, manejo de errores, responsive mobile.

---

## 🚀 OBJETIVO FINAL (después de la auditoría)
**Convertir el panel en PWA instalable en celular** con:
- Manifest + service worker → "Agregar a inicio" en el teléfono (ícono como app nativa).
- **Web Push notifications** (funcionan con app cerrada) cuando: se sube contenido, cambia status, hay modificaciones.
- Requiere: VAPID keys, tabla de `push_subscriptions`, edge function que mande pushes, service worker que las reciba.
- Uso primario del admin desde el celular.

---

## 📋 ORDEN SUGERIDO AL RETOMAR
1. **Verificar/arreglar triggers de notificaciones** (causa raíz del "no pasa nada").
2. **Arreglar edge functions** (`send-notification-digest`, `delete-user`).
3. **Auditoría completa** (seguridad RLS, funcionalidad, responsive).
4. **PWA + Web Push** (objetivo final).
