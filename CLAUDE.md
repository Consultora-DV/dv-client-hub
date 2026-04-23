# CLAUDE.md — dv-client-hub
> Briefing permanente para cualquier sesión de trabajo (Claude Code, Cowork, o cualquier agente).
> Leer completo antes de tocar cualquier archivo.

---

## 1. QUÉ ES ESTE PROYECTO

**dv-client-hub** es el portal premium de clientes de **Consultora DV** (Dante Vega).

No es un social media manager, no es un CRM, no es una herramienta SaaS genérica. Es un panel privado donde cada cliente de la consultora entra a ver su propio trabajo: videos en revisión, guiones, calendario editorial, métricas y documentos. El objetivo es eliminar el caos de WhatsApp y hacer que el cliente perciba valor profesional sin que Dante tenga que reportar manualmente.

**URL producción:** https://paneldecliente.lovable.app
**Repo:** https://github.com/Consultora-DV/dv-client-hub
**Construido con:** Lovable (generador IA) + GitHub como repo de control

---

## 2. QUIÉN ES DANTE VEGA — CONSULTORA DV

Dante Vega es el fundador de **Consultora DV**, una agencia de marca personal y estrategia de contenido. Su propuesta de valor es: la marca personal es el mejor activo de un profesional o empresario, y Consultora DV construye, escala y gestiona esa marca.

**Marca personal de Dante:**
- Publica contenido educativo sobre marca personal, escalado de negocios y estrategia de contenido
- Contenido en español (mercado LATAM), ocasionalmente inglés
- Hooks probados: momento WTF emocional, cita de autoridad (Gates, Musk), pregunta retórica con datos
- TOP video: "Sistema de Contenido" (5K+ views en 1 día) — formato paso a paso + CTA comentarios
- Baseline normal: 500-1,000 reproducciones | bueno: 2,000+ | excelente: 5,000+

**Estilo de comunicación:**
- Directo, sin relleno, sin patrón "No es X, es Y" (suena a IA genérica, rompe autoridad)
- Hablar como consultor con criterio, no como coach de redes

---

## 3. STACK TÉCNICO

```
Frontend:    React 18 + TypeScript + Vite
Estilos:     Tailwind CSS + shadcn/ui (componentes Radix)
Animaciones: Framer Motion
Gráficas:    Recharts
Auth:        Supabase Auth (signInWithPassword + signUp)
DB:          Supabase (PostgreSQL)
Storage:     Supabase Storage — bucket "documents"
Edge Fns:    Supabase Edge Functions (Deno)
Routing:     React Router DOM v6
Forms:       React Hook Form + Zod
Notifs:      Sonner (toast)
PDF:         pdfjs-dist 4.4.168 — worker centralizado en src/lib/pdfConfig.ts
Búsqueda:    cmdk (CommandDialog, Cmd+K)
```

**Variables de entorno requeridas:**
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_WHATSAPP_NUMBER   (fallback: 5216682343672)
```

**Comandos:**
```bash
npm run dev      # desarrollo local
npm run build    # producción
npm run test     # vitest
```

---

## 4. ARQUITECTURA — ARCHIVOS CLAVE

```
src/
├── contexts/
│   ├── AuthContext.tsx        # Auth Supabase + user/role
│   ├── AppStateContext.tsx    # Estado global (clientes, videos, scripts, docs, calendario, notifs)
│   └── ThemeContext.tsx       # Dark/light mode
├── pages/
│   ├── AuthPage.tsx           # Login + Registro + Forgot password
│   ├── ResetPasswordPage.tsx  # Reset con token de Supabase
│   ├── DashboardPage.tsx      # Resumen general
│   ├── VideosPage.tsx         # Listado + detalle + aprobaciones
│   ├── DocumentsPage.tsx      # Guiones + documentos + upload a Supabase Storage
│   ├── CalendarPage.tsx       # Calendario editorial mensual
│   ├── MetricsPage.tsx        # Métricas por plataforma + PDF parser
│   ├── ProfilePage.tsx        # Perfil del cliente seleccionado
│   ├── UsersPage.tsx          # Admin: gestión de usuarios
│   └── OnboardingPage.tsx     # Onboarding de nuevo cliente (4 pasos)
├── components/
│   ├── AppLayout.tsx          # Layout principal (header + sidebar + contenido)
│   ├── AppSidebar.tsx         # Navegación lateral con LogOut
│   ├── NotificationBell.tsx   # Campana de notificaciones
│   ├── GlobalSearch.tsx       # Búsqueda Cmd+K (videos, guiones, docs, eventos)
│   ├── ImportModal.tsx        # Import Apify Instagram
│   ├── ProfileModal.tsx       # Editar perfil + cambio de contraseña
│   ├── EmptyState.tsx         # Estado vacío reutilizable
│   ├── ConfirmDialog.tsx      # AlertDialog de confirmación para eliminar
│   └── ListPagination.tsx     # Paginación (15 items/página por defecto)
├── services/
│   ├── aiParserService.ts     # Parser AI → llama Edge Function ai-parse-blueprint
│   └── metricsParser.ts       # Parser PDF de métricas (heurístico)
├── data/
│   └── mockData.ts            # SOLO interfaces/tipos y arrays vacíos. NO importar clients desde aquí.
├── lib/
│   └── pdfConfig.ts           # URL centralizada del worker de PDF.js 4.4.168
└── integrations/
    └── supabase/
        ├── client.ts          # createClient con auth persistente
        └── types.ts           # Tipos generados de la DB

supabase/
├── functions/
│   ├── ai-parse-blueprint/    # Edge Fn: recibe texto → Gemini 2.5 Flash → JSON estructurado
│   ├── apify-proxy/           # Edge Fn: proxy para scraping Instagram via Apify
│   └── invite-user/           # Edge Fn: crea usuario como admin (sin desloguear al admin actual)
└── migrations/                # Migraciones SQL en orden cronológico
```

**Regla crítica:** Los clientes vienen de `useAppState().clients` — NUNCA de `mockData.ts`. El array `clients` en mockData fue eliminado.

**Roles del sistema:** `admin` | `editor` | `diseñador` | `cliente`

---

## 5. FASE ACTUAL — MVP

**Estado:** MVP construido y en producción (abril 2026).

**Lo que funciona:**
- Auth completa (login, registro, forgot password, reset)
- Dashboard con actividad reciente y próxima publicación
- Videos con embeds nativos (Instagram, YouTube, TikTok), aprobaciones y filtros por status
- Documentos y guiones con upload real a Supabase Storage + paginación
- Calendario editorial con navegación dinámica y filtros por tipo de contenido
- Métricas por plataforma con parser PDF + gráficas Recharts
- Import de posts de Instagram via Apify (scraping proxy via Edge Function)
- Búsqueda global Cmd+K
- Onboarding de 4 pasos con parser AI de blueprint
- Sistema de usuarios con invitación via Edge Function (sin desloguear admin)
- Roles y permisos (usePermissions hook)
- Notificaciones en header
- Selector de cliente (admin ve todos; cliente ve solo el suyo)

**Clientes piloto activos:**
- Dra. Fedra Aldama (cliente estrella)
- Bianca Aldama (en proceso de cierre)
- Héctor Benazuza (en proceso de cierre)

**LO QUE NO SE CONSTRUYE EN MVP — pertenece a Fase 1 (meses después):**
- Chat interno
- Publicación directa a redes sociales
- APIs directas de Meta/YouTube/TikTok
- Drive bidireccional
- Reportes PDF automáticos
- Whitelabel
- Facturación / cobros
- Inbox unificado
- Panel admin complejo
- Notificaciones por email (Resend — Fase 2)

---

## 6. PLAN DE CRECIMIENTO

### Fase MVP (ahora — validación)
Onboardear los 3 clientes piloto. Validar 4 métricas:
1. ¿Entran sin fricción?
2. ¿Aprueban contenido dentro del panel?
3. ¿Bajan los WhatsApps?
4. ¿El equipo se organiza mejor?

### Fase 1 (algunos meses después de validar MVP)
- Supabase completo con admin panel robusto
- Roles granulares
- WhatsApp outbound (Twilio)
- Notificaciones email (Resend)
- Integración social: Meta primero → YouTube → TikTok al final

### Fase 2 (largo plazo)
- Software Consultora DV como SaaS vendible
- Chats IA entrenados por cliente
- Integración social completa

**Regla de scope:** Si alguien pide algo que no está en MVP, la respuesta es "pertenece a Fase 1, lo anotamos."

---

## 7. EXPEDIENTES DE CLIENTES

---

### CLIENTE 1 — DRA. FEDRA ALDAMA CASTRO ⭐ (ESTRELLA)

**Estado:** Cliente activa desde antes de abril 2026. La de mayor trabajo y más avanzada.

**Identidad:**
- Médico Cirujano, UAG (título: 14 enero 2017). Cédula SEP: 11015233
- Permiso COFEPRIS: 2525015007D00031 — Aldama Farmacéutica
- Ubicación: Los Mochis, Sinaloa, México
- Especialidad: Nutrición clínica, bariatria y balance metabólico
- Producto propio: **Aldama Nutrisac** (proteína suero de leche: Vainilla, Moka, Matcha) — único producto de venta directa, siempre con toggle de Contenido Patrocinado en TikTok

**Situación TikTok:**
- Cuenta original @dra.fedra.aldama: suspendida permanentemente (ban por revisión retroactiva IA de TikTok, acumuló infracciones automáticas en videos 2020-2024 con normas 2024-2025)
- Escalamiento enviado a Trust & Safety Policy Team (pendiente desde 01 abril 2026)
- **Nueva cuenta activa desde 01 abril 2026** — correo, número y dispositivo distintos, arranca limpia

**Tono y personalidad de marca:**
- Estoico, directo, culto, empoderador. Sin drama, sin victimismo.
- Médica certificada que explica como si diera clase — no como influencer.
- Lenguaje clínico pero accesible.
- Firma siempre: **"Soy la Dra. Fedra Aldama"**
- NO es coach de bienestar. NO promete resultados mágicos.

**La regla de oro del contenido:**
Se puede hablar de todo (obesidad, resistencia a la insulina, control de peso, tratamientos) pero SIN nombres de marca de medicamentos de prescripción y SIN lenguaje de pérdida de peso como objetivo primario. El enfoque es siempre **SALUD METABÓLICA**, nunca pérdida de peso.

**Diccionario prohibido → aprobado:**

| PROHIBIDO | APROBADO |
|-----------|----------|
| Bajar de peso / perder peso | Mejorar la composición corporal / salud metabólica |
| Quemar grasa / adelgazar | Regular el metabolismo / revertir la resistencia a la insulina |
| Control de peso (especialidad) | Bariatria y balance metabólico |
| Ozempic / Wegovy / Victoza / Mounjaro / Saxenda / Zepbound / Liraglutida / Semaglutida / Tirzepatida / Retatrutida | Análogo del receptor GLP-1 (sin nombre de marca) |
| Hormona del hambre | Señales de saciedad / regulación del apetito |
| Adicción a la comida (hiperbólico) | Respuesta neurobiológica a los ultraprocesados |
| Antes y después (imágenes corporales) | ELIMINAR — prohibido bajo cualquier contexto |

**Hashtags prohibidos:**
`#Ozempic #Wegovy #GLP1 #GLP-1 #semaglutida #Victoza #Mounjaro #Saxenda #analogosGLP1 #Zepbound #bajarDePeso #perderPeso #adelgazar #quemarGrasa #dietaParaBajarDePeso #controlDePeso #antesYDespues #Tirzepatida #Retatrutida #PérdidaDePeso`

**Hashtags aprobados:**
`#SaludMetabolica #EquilibrioHormonal #ResistenciaALaInsulina #Bariatria #NutricionClinica #NutricionMedica #InflamacionCronica #MedicinaPreventiva #DraFedraAldama #NutrioLogaMexico #SaludDigestiva #MicrobiomaMexico #ComposicionCorporal #MetabolismoSano #AldamaNutrisac`

**Disclaimer obligatorio en videos con tratamientos o medicamentos:**
- Audio: *"Recuerda que cualquier tratamiento médico requiere prescripción y supervisión de un médico certificado. Nunca te automediques ni compres medicamentos sin receta."*
- Texto superpuesto: "Tratamiento bajo prescripción médica obligatoria. No te automediques."
- Ubicación: primeros 5 segundos Y últimos 5 segundos.

**5 pilares de contenido:**

| % | Pilar | Descripción |
|---|-------|-------------|
| 30% | Autoridad Clínica | Demuestra ser médica certificada. Diferencia entre médica e influencer. |
| 25% | Educación Metabólica | Enfermedades y condiciones sin mencionar medicamentos por nombre. |
| 25% | Nutrición Práctica | Planes, recetas, hábitos metabólicos, desmitificación de dietas. |
| 10% | Casos Clínicos Anonimizados | Reales, sin datos personales, sin nombre de medicamento. |
| 10% | Comunidad y Preguntas | Responder dudas, desmitificar mitos virales. Alta interacción, bajo riesgo. |

**Estructura de guión TikTok:**
1. HOOK (0-3 seg): Pregunta, dato sorpresivo o afirmación directa
2. CONTEXTO (3-15 seg): "Como médica especialista, lo que veo en consulta es..."
3. NÚCLEO EDUCATIVO (15-50 seg): Información clínica con lenguaje aprobado
4. REMATE (50-60 seg): Conclusión práctica
5. CTA (60-70 seg): "Soy la Dra. Fedra Aldama. Si quieres saber más, haz tu valoración en el link de mi perfil."

**Histórico TikTok (cuenta suspendida):**
- Pico máximo: 25-28 dic 2025 (~97K-130K views/día, +5K likes/día)
- Baseline normal: 8K-15K views/día
- Videos más virales: respuestas a comentarios (352K views), casos de pacientes
- Meta para nueva cuenta: reconstruir autoridad desde cero con lineamientos nuevos

**Expedientes en workspace:**
- Diccionario GLP-1 + guiones — generados en sesiones previas

---

### CLIENTE 2 — BIANCA ALDAMA

**Estado:** Prospecto caliente. Primera reunión: 8 abril 2026. Segunda reunión + cierre: 22 abril 2026 (visita presencial GDL de Dante). Referida por Fedra Aldama — aplica comisión si cierra.

**Negocio:** Bianca Aldama Boutique — calzado + ropa femenina de moda
- Fundada en 2014
- 3 tiendas físicas en Zapopan, GDL: Plaza Coronado, Av. Venustiano Carranza 936 (zapatería), Av. V. Carranza 802 (boutique)
- E-commerce en biancaaldama.com

**Presencia digital (estado 8 abril 2026):**
- Instagram: 73K seguidores (@biancaaldamaboutique) — ella misma modela los outfits
- Facebook: 167K seguidores, promedio 20 reacciones/post, sin reels, 400 opiniones con 94% recomendación — dormida
- TikTok: 3K seguidores, sin bio, sin links, abandonada
- Google Maps: zapatería no existe en Maps; boutique 3.8 estrellas con solo 5 opiniones

**Dolores identificados:**
1. Facebook con 167K completamente dormida por falta de reels
2. Invisible en Google Maps — pierde tráfico local
3. TikTok abandonada con potencial viral sin explotar
4. Opera solo como catálogo de productos, no hay marca personal
5. Sin monetización adicional (cursos, colabs pagadas, etc.)

**Objetivo de Dante con Bianca:**
- Determinar si quiere ser marca personal o solo vender más
- No hay conflicto de interés con Fedra (nicho diferente: moda vs medicina)
- Propuesta formal en segunda reunión (22 abril)

**Documentos generados:**
- bianca_aldama_onboarding.docx
- bianca_maestro.docx
- Propuesta_Bianca_Aldama_Fashion.html (en progreso)

---

### CLIENTE 3 — HÉCTOR (HACIENDA BENAZUZA)

**Estado:** Lead espontáneo. Primera conversación: 8 abril 2026 (al terminar reunión con Bianca). Visita presencial planeada: 22 abril 2026 — recorrido por hacienda + posible firma de contrato.

**Quién es Héctor:**
- Licenciado en Música, actor, 4 años en contenido
- Arquitecto con constructora propia
- Socio/accionista de Hacienda Benazuza desde ~1 año

**El negocio — Hacienda Benazuza:**
- 25+ años en Zapopan, GDL
- 54 hectáreas, 4 de lago
- Salón: 1,100 m² (capacidad 1,200-1,800 personas)
- Construcciones en curso: Palacio europeo (mayo 2026) + Hotel boutique + Explanada para masivos
- Modelo "All in House" — todo incluido sin planners externos
- 30% bodas destino internacionales (árabes, hindúes, chinos, americanos)
- Agenda llena todo 2026, ya vendiendo 2027
- Exclusivas: Michelle Porru (florería) + Maqué Bakery (repostería)
- Trajo Mayan Warrior a GDL (cancelado por contingencia de seguridad)

**Estado digital (8 abril 2026):**
- Instagram: activa pero nadie atiende bien los DMs
- Facebook: COMPROMETIDA — ligada a ex-administradora que robó ~1.5M MXN
- Google Maps: 1,500+ reseñas (sin optimizar)
- Web: haciendabenazuza.com — no existe / no funciona
- TikTok: contenido propio en Canva — calidad no refleja el nivel del lugar

**Dolores críticos:**
1. Sin página web → pierde clientes internacionales
2. Facebook comprometida por ex-admin → recuperar URGENTE
3. Atención al cliente en redes = desastre
4. Contenido de bajo nivel para un producto de lujo

**Objetivos:**
- Página web premium con formulario filtro + calendario + Stripe
- Difusión masiva del producto All in House
- Escala transnacional (bodas destino)
- Posicionarse como venue de masivos (Mayan Warrior 2027)

**Documentos generados:**
- hector_benazuza_maestro.docx
- hector_blueprint_final.docx
- Propuesta_Hector_Benazuza_Luxury.html ✓

---

## 8. EQUIPO CONSULTORA DV

- **Dante Vega** — fundador, estrategia, marca personal, dirección creativa
- **2 editores de video**
- **1 Project Manager**
- El panel es para clientes Y para que el equipo interno se organice

---

## 9. PATRONES DE CÓDIGO — CONVENCIONES

**Obtener clientes:** SIEMPRE de `useAppState().clients`. NUNCA de mockData.
```tsx
const { clients } = useAppState();
```

**Obtener usuario y rol:**
```tsx
const { user, isAdmin } = useAuth();
```

**Llamar Edge Functions:**
```tsx
const { data, error } = await supabase.functions.invoke("nombre-funcion", { body: { ... } });
```

**Subir archivos:**
```tsx
supabase.storage.from("documents").upload(path, file);
```

**Notificaciones:**
```tsx
import { toast } from "sonner";
toast.success("Mensaje"); toast.error("Error");
```

**Navegación:**
```tsx
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
```

**Clases de diseño del sistema (tokens propios):**
```
gold-gradient       — gradiente dorado de la marca
gold-text           — texto dorado
gold-border         — borde dorado
gold-glow           — sombra dorada
glass               — efecto glassmorphism oscuro
text-primary        — color primario (dorado)
text-status-approved / text-status-pending / text-destructive
bg-secondary        — fondo de cards/inputs
```

---

## 10. RUTAS DE LA APP

```
/               — Dashboard
/videos         — VideosPage
/documentos     — DocumentsPage
/calendario     — CalendarPage
/metricas       — MetricsPage
/perfil         — ProfilePage
/usuarios       — UsersPage (solo admin)
/onboarding     — OnboardingPage (nuevo cliente)
/auth           — AuthPage (login/registro)
/reset-password — ResetPasswordPage
```

---

## 11. BASE DE DATOS — TABLAS PRINCIPALES

```
profiles          — datos de usuario (name, avatar, email, role, social_links, etc.)
user_roles        — roles (UNIQUE constraint en user_id)
videos            — videos del cliente
scripts           — guiones
documents         — documentos
calendar_events   — eventos del calendario editorial
notifications     — notificaciones
storage:documents — bucket para archivos subidos
```

---

## 12. LO QUE NO TOCAR SIN CONSULTAR

- El scope del MVP (ver sección 5)
- La estructura de roles en user_roles — tiene migraciones SQL específicas
- La Edge Function `invite-user` — crea usuarios sin desloguear al admin, es intencional
- El worker de PDF.js — está centralizado en `src/lib/pdfConfig.ts` con versión 4.4.168, no cambiar sin actualizar los dos lugares que lo usan
- El archivo `src/data/mockData.ts` — solo contiene interfaces/tipos, no debe exportar datos reales

---

*Última actualización: 15 abril 2026 — Dante Vega / Consultora DV*
