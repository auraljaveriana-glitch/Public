# Aural · Página pública de agendamiento

Esta es la página que el paciente ve cuando le llega el link por WhatsApp.
No necesita cuenta ni contraseña — cualquiera con el link puede agendar.

Es un proyecto **separado** del panel de administración (`aural-admin`),
pero usa la misma base de datos de Supabase.

## 1. Antes de nada: corre el SQL de seguridad

En Supabase → **SQL Editor**, corre el archivo `reserva_publica_funciones.sql`
(el que está junto a este). Esto:

- Crea dos funciones (`horarios_disponibles_publico` y `crear_cita_publica`)
  que son las únicas puertas de entrada que tiene el público — nunca acceden
  directo a las tablas de pacientes o citas de otras personas.
- Da permiso de solo-lectura al público sobre `sedes` y `audiologos` activos
  (nombre y ciudad, nada sensible).

**Sin este paso, la página pública no va a poder cargar ni sedes ni horarios.**

## 2. Configurar y correr localmente (para probar)

```bash
npm install
cp .env.example .env
# pega tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (las mismas del panel de admin)
npm run dev
```

## 3. Desplegar en Netlify (como sitio nuevo, separado del panel de admin)

1. Sube esta carpeta a un repositorio de GitHub nuevo (ej. `AuralAgendar`)
2. En Netlify: **Add new site → Import an existing project** → elige ese repo
3. Build command: `npm run build` — Publish directory: `dist`
4. Agrega las mismas variables de entorno: `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY`
5. Deploy

Vas a terminar con **dos sitios en Netlify**:
- `aural-admin` (o como lo hayas llamado) → para tu equipo, con login
- `aural-agendar` (este) → público, sin login, es el link que le mandas al paciente

## Cómo funciona el flujo

1. Paciente elige **sede**
2. Elige **audiólogo** de esa sede
3. Elige una **fecha**
4. El sistema calcula en vivo los horarios libres ese día (cruza el horario
   base o el calendario por fecha específica, contra las citas ya tomadas)
5. Paciente escribe **nombre y WhatsApp**
6. Se crea la cita con estado `pendiente` — queda lista para que n8n dispare
   la confirmación por WhatsApp (ver siguiente sección)

## Pendiente: conectar con Amanda/n8n

Cuando se crea una cita desde aquí, queda en la tabla `citas` con
`estado = 'pendiente'` y `notificacion_enviada = false`. Para que Amanda
mande la confirmación automática por WhatsApp:

1. En Supabase → **Database → Webhooks → Create a new webhook**
2. Tabla: `citas` — Evento: `INSERT`
3. URL: tu webhook de n8n
4. n8n recibe los datos de la cita (incluye teléfono del paciente vía
   `paciente_id`, tendrías que hacer un lookup o ajustar el webhook para
   incluir el join) y dispara el mensaje de WhatsApp

Si quieres, en la próxima sesión armamos ese flujo de n8n paso a paso.

## Limitación conocida

Los **bloqueos** (vacaciones, incapacidades) todavía no se están restando
del cálculo de disponibilidad — si un audiólogo tiene un bloqueo cargado en
la tabla `bloqueos`, la página pública igual podría mostrar sus horarios
normales ese día. Lo sumamos cuando lo necesites.
