# Progreso del proyecto

Última actualización: 29/10/2026 — Fase 1 + v0.2.

## v0.2
- [x] Cálculos y pantalla del tacógrafo en **UTC** (semana lunes 00:00 – domingo 24:00 UTC); hora local solo informativa
- [x] Nueva cabina de camión con LED: carretera animada en perspectiva, día/noche según hora local, retrovisores de camión,
      estantes de techo, volante grande casi horizontal, consola envolvente, selector de marcha, claxon, colgante y taza
- [x] 50 pruebas unitarias y E2E ampliada (LED, selector de marcha, UTC)

## Fase 1 — Núcleo funcional ✅ (prototipo)
- [x] Proyecto React 18 + TypeScript estricto + Vite 6 + Tailwind 4 + Zustand 5 + Vitest 3
- [x] Estructura por dominios
- [x] Reloj virtual determinista (pausa, ×1, ×5, ×30, ×60, +15 min, +1 h, avanzar hasta, siguiente evento)
- [x] Línea temporal de eventos como única fuente de verdad (UTC interno, presentación Europe/Madrid, DST)
- [x] Tacógrafo ficticio TL-1 EDU con máquina de estados: pantalla estándar (3 páginas), menú, tiempos,
      actividades de hoy, resumen de jornada, información, inserción, entrada manual, país inicio/fin, retirada
- [x] Selector de actividades; conducción automática por movimiento; seleccionado ≠ registrado
- [x] Avisos 4 h 15 / 4 h 30 con referencia normativa; conducción sin tarjeta
- [x] Persistencia local (estado activo, punto guardado, reinicio, borrado de datos)
- [x] Historial: barras de 14 días, tabla de actividades, registro del equipo
- [x] Cabina 2D (SVG) con transición de cámara al tacógrafo
- [x] Modo asistido (guía contextual + resaltado) y modo libre
- [x] Pantallas: Inicio, Cabina, Tacógrafo (+ laboratorio de tiempo), Historial, Academia (catálogo), Premium (sin pagos), Ajustes
- [x] Arquitectura de permisos por funcionalidad y precio configurable (pagos desactivados)
- [x] 48 pruebas unitarias + prueba E2E en navegador real

## Pendiente / conocido
- [x] Referencias contrastadas con el texto consolidado oficial 02006R0561-20241231 (extracto en `docs/normativa/`)
- [ ] Revisión jurídica profesional de las interpretaciones (ver REGULATIONS.md)
- [ ] Contrastar Reglamento (UE) 165/2014, Reglamento de Ejecución 2016/799 (anexo IC) y Directiva 2002/15/CE
- [ ] Entrada manual: solo pasos de 15 min; sin edición de país por periodo
- [ ] Solo dos tarjetas ficticias predefinidas; la ranura inserta la primera
- [ ] Sin vista de calendario semanal detallada por horas (Fase 3)
- [ ] Sin internacionalización (textos en español en componentes)
- [ ] Accesibilidad: falta auditoría completa (lectores de pantalla, contraste AA medido)

## Siguiente paso: Fase 2 — Motor normativo
1. ~~Obtener y archivar el texto consolidado vigente~~ (hecho: 31.12.2024). Contrastar la Directiva 2002/15/CE (disponibilidad).
2. Segmentar la línea temporal en **periodos de trabajo diarios** delimitados por descansos (11 h, 3+9, ≥9 h reducido).
3. Reglas: 9 h/10 h (contador de ampliaciones por semana), 56 h, 90 h, descansos diarios/semanales, reducciones y
   compensaciones con fecha límite (estado pendiente más allá del horizonte).
4. Escenarios de referencia con resultados esperados y tests por regla.
5. Clasificación aviso / infracción simulada / requiere contexto.
