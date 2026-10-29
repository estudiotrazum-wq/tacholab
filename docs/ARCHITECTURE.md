# Arquitectura — TachoLab EU

## 1. Análisis de requisitos (resumen)
Producto: simulador educativo de tacógrafo digital genérico, en español de España, con cabina virtual,
dispositivo interactivo, reloj virtual acelerable, horizonte fijo de **dos semanas**, motor normativo
(Reg. 561/2006), academia y modelo freemium. Se construye por fases; este documento cubre la base y la Fase 1.

## 2. Contradicciones, ambigüedades y riesgos detectados

| # | Tema | Decisión / estado |
|---|------|-------------------|
| 1 | **Zona horaria de la semana normativa.** Los tacógrafos registran en UTC; el usuario piensa en hora local. | **Decidido (v0.2): UTC.** Días y semanas (lunes 00:00 – domingo 24:00) se calculan en UTC; la pantalla del tacógrafo y el laboratorio de tiempo muestran UTC. La hora local (Europe/Madrid) solo es informativa (página "HORA" del equipo, reloj del salpicadero, luz del paisaje). Los guardados v1 (hora local) se descartan al cargar. |
| 2 | **Velocidad máxima ×60** frente a simular 14 días (≈5,6 h reales). | Se añaden saltos: +15 min, +1 h, "avanzar hasta" y "siguiente evento relevante". Se puede añadir ×600 sin cambios de arquitectura. |
| 3 | **Disponibilidad como pausa.** | Solo `REST` cuenta como pausa (criterio conservador). Requiere validación. |
| 4 | **Periodos sin tarjeta sin entrada manual.** | No cuentan como pausa (conservador) y se marcan en el registro. Requiere validación. |
| 5 | **Comportamiento al detener el vehículo** varía entre equipos reales. | Configurable (por defecto "otros trabajos") y etiquetado como aproximación pedagógica. |
| 6 | **"Validar premium en servidor"** frente a "uso sin cuenta". | Contenido gratuito 100 % local. El contenido premium deberá servirse/validarse desde backend (Supabase) en Fase 6; la comprobación local solo afecta a la UI. |
| 7 | **Horizonte de 14 días** frente a obligaciones de compensación que vencen después. | Diseño previsto (Fase 2/3): las obligaciones se modelan con fecha límite y estado `pendiente` aunque termine la simulación. |
| 8 | **Verificación normativa contra fuentes oficiales.** | EUR-Lex no fue accesible de forma automatizada desde el entorno de desarrollo. **Ninguna regla está marcada como verificada.** Ver `REGULATIONS.md`. |
| 9 | **Escenario 56 + 34 h** debe ser coherente con descansos diarios/semanales. | Se construirá y validará con el motor completo en la Fase 3; no se fabricará como bloque aislado. |
| 10 | **Parecido con dispositivos reales.** | Dispositivo ficticio "TL-1 EDU" con diseño, menús y textos propios. Ver `LEGAL_RISKS.md`. |

## 3. Principios
- **Una única fuente de verdad temporal**: la línea temporal de eventos (`time-engine/timeline.ts`). Todos los contadores se derivan de ella.
- **Núcleo puro y determinista**: `simReducer(estado, acción) → estado`. Sin `Date.now()` ni efectos dentro del dominio; el reloj real solo entra como `TICK { realDeltaMs }`.
- **Separación de estados** (requisito 15):
  1. Estado visual → `ui/uiStore.ts` (vista, preferencias).
  2. Estado operativo del dispositivo → `tachograph/types.ts` (`DeviceState`, máquina de pantallas).
  3. Eventos temporales → `time-engine/timeline.ts`.
  4. Cálculos normativos → `regulations/` (funciones puras sobre eventos).
  5. Progreso del usuario → `academy/`, `achievements/` (Fase 5).
  6. Permisos comerciales → `billing/plans.ts`.

## 4. Estructura
```
src/
  shared/        tipos comunes (Activity, EpochMs)
  time-engine/   units, zoned (zonas horarias/DST), clock (reloj virtual), timeline (eventos)
  regulations/   rules (catálogo), continuousDriving (art. 7, preliminar)
  tachograph/    types (máquina de estados), manualEntry, display (modelo de pantalla)
  simulator/     state, engine (reductor), derived (resúmenes), store (Zustand)
  scenarios/     scenario (horizonte 14 días), cards (tarjetas ficticias)
  academy/       assist (modo asistido), exercises (catálogo)
  achievements/  (Fase 5)
  billing/       plans (features, precios, entitlements)
  persistence/   storage (localStorage, puntos guardados, borrado)
  ui/            App, screens/, components/, hooks/
e2e/             smoke.mjs (Playwright)
docs/
```

## 5. Entidades principales
- **ActivityEvent** `{ id, activity, start, end|null, driverId|null, scenarioId, source: device|manual, meta }` — duración derivada.
- **ClockState** `{ now, speed: 0|1|5|30|60, carryMs, startsAt, endsAt }` — solo avanza; precisión sub-ms con arrastre.
- **ScenarioMeta** `{ id, title, weekOneStart (lunes 00:00 local), startsAt, endsAt (+14 días locales), timeZone }`.
- **FictionalCard** `{ id, displayId "SIM-…", holderName, lastWithdrawalAt }`.
- **DeviceState** `{ insertedCardId, insertedAt, selected, screen, notice, warning, warnFlags }`.
- **LogEntry** registro del equipo (tarjeta, país, entrada manual, avisos, vehículo, selección).
- **SimState** agrega todo lo anterior + `config` y es lo que se persiste.

## 6. Máquina de estados del dispositivo
```
STANDARD(page 0..2) --OK--> MENU --OK--> TIMES | DAY_ACTIVITIES | TICKET | DEVICE_INFO | (WITHDRAW→COUNTRY end)
  ^  ^                         \--BACK--> STANDARD
  |  |
  |  +-- COUNTRY(start) <-- MANUAL_CONFIRM <-- MANUAL_EDIT(activity|end)* <-- MANUAL_ASK <-- WELCOME <-- INSERT_CARD
  +----- COUNTRY(end) --OK--> tarjeta retirada
```
- `ACTIVITY` cicla `WORK → AVAILABILITY → REST` (solo con tarjeta y vehículo parado).
- Movimiento ⇒ actividad registrada `DRIVING` (independiente de la seleccionada).
- Avisos (`warning`) bloquean la pantalla hasta ✓/✕. Mensajes (`notice`) son transitorios.
- Iniciar la marcha interrumpe el procedimiento de inserción/entrada manual.

## 7. Motor temporal
- `TICK` convierte tiempo real × velocidad en avance, con arrastre de fracciones redondeado a µs.
- Los avances largos se detienen en cada umbral relevante para registrar avisos en su instante exacto (aunque se salte 5 h de golpe).
- `nextRelevantEvent`: umbral de 4 h 15/4 h 30, pausa completada (15/30/45), medianoche local o fin de escenario.
- Zonas horarias con `Intl` (sin dependencias); días de 23/25 h y horas inexistentes/ambiguas resueltas y probadas.

## 8. Evolución prevista
- Cabina (v0.2): camión de cabina adelantada en 2D por capas — paisaje HTML/CSS con carretera en perspectiva 3D (`ui/cabin/CabinScene.tsx`) e interior SVG (`ui/cabin/CabinInterior.tsx`) con iluminación LED configurable. Puntos interactivos: tacógrafo, selector de marcha N/D (pone el vehículo en marcha de verdad), luces LED (5 colores, persistido) y claxon. Los LED parpadean en naranja con un aviso activo; la taza humea si se registra pausa; la carretera solo se mueve si el camión está en marcha y el reloj corre. Migrable a React Three Fiber sin tocar el dominio.
- Persistencia: interfaz `KeyValueStorage` → adaptador Supabase (Fase 6).
- Pagos: `billing/` + webhook Stripe → entitlements en servidor (Fase 6).
- i18n: textos de UI centralizables; el dominio usa códigos (`DRIVING`, `WORK`…).
