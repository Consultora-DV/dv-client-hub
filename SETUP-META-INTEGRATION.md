# Configuración: Integración Meta API (v-claudecode)

## Pasos para activar en Supabase

### 1. Ejecutar migraciones SQL

En el **Supabase SQL Editor** de tu proyecto (`wczkjsqcqbvqkmbyrzrr`):

```
Supabase Dashboard → SQL Editor → New Query
```

Ejecuta en orden:
1. `20260508120000_add_meta_integration.sql` — Crea tablas `platform_tokens` e `ig_sync_log`
2. `20260508130000_seed_the_skin_club_client.sql` — Crea el cliente The Skin Club (lee instrucciones adentro)

---

### 2. Crear usuario The Skin Club en Authentication

```
Supabase Dashboard → Authentication → Users → Invite user
Email: theskinclub@dantemvp.com
```

Copia el UUID generado → pégalo en el script SQL del paso 1.

---

### 3. Deploy la Edge Function `meta-ig-sync`

```bash
# Desde la raíz del proyecto:
supabase functions deploy meta-ig-sync --project-ref wczkjsqcqbvqkmbyrzrr
```

---

### 4. Configurar el token en el panel

Una vez que el admin entre al panel con su usuario:

1. Ir a **Métricas → Instagram**
2. Clic en **⚙️ (engrane)** junto a "Sincronizar con Meta"
3. Llenar:
   - **IG User ID**: `17841447268646281`
   - **Username**: `theskinclubmx`
   - **Access Token**: *(pegar el long-lived token de ~/meta-ads/.env)*
   - **Page ID**: `700532247451757`
   - **Ad Account ID**: `act_995765777907038`
4. Guardar → Clic en **"Sincronizar con Meta"**

---

## Flujo completo de datos

```
Meta Graph API (Instagram)
    ↓  (Edge Function meta-ig-sync)
Supabase → tabla post_metrics (platform='instagram')
    ↓
MetricsPage → tab Instagram
    → KPIs, gráficas, tabla de posts
    → Datos reales: reach, saves, engagement por post
```

## Credenciales relevantes (The Skin Club)

| Campo | Valor |
|---|---|
| IG Username | @theskinclubmx |
| IG User ID | 17841447268646281 |
| Facebook Page ID | 700532247451757 |
| Ad Account ID | act_995765777907038 |
| Token ubicación | ~/meta-ads/.env → ACCESS_TOKEN |

## Renovación del token

El token expira aprox. cada 60 días. Antes de que expire:
1. Ve a developers.facebook.com → Graph API Explorer
2. Genera nuevo token con los mismos scopes
3. Actualiza en el panel: ⚙️ → Access Token → Guardar
