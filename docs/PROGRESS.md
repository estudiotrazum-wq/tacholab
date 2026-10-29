# Progreso del proyecto

Última actualización: 29/10/2026 — Fase 1 + v0.2.

## Fase 4 — Experiencia inmersiva ✅ (rama `fase-4-inmersiva`)
- [x] Cámara con cuatro puntos de vista (conducción, tacógrafo, retrovisor, consola de techo), transiciones y encuadre
      limitado para no mostrar zonas vacías (`ui/cabin/camera.ts`, probado)
- [x] Mirada con el ratón (paralaje con profundidad: el paisaje se mueve menos que el interior)
- [x] El tacógrafo se maneja **dentro de la cabina** (el componente real superpuesto, con teclado)
- [x] Iluminación continua según la hora local: cielo, sol que recorre el cielo, luna, estrellas, carretera más oscura de
      noche (`ui/cabin/lighting.ts`, probado)
- [x] Interruptores funcionales: faros (haz sobre la calzada), luz interior, emergencia (testigos e intermitentes de los
      espejos) y LED; parasol abatible; panel de techo con color e intensidad de los LED
- [x] Reflejo del retrovisor con marcas viales en movimiento
- [x] Calidad visual «Básica» para ordenadores modestos y respeto de «reducir movimiento»
- [x] Tableta: cabina completa; móvil: modo dispositivo recomendado y barra de control fija
- [x] 85 pruebas unitarias + E2E con cámaras, interruptores, LED y móvil

## Fase 3 — Laboratorio de dos semanas ✅ (rama `fase-3-laboratorio`)
- [x] Calendario de 14 días (sustituye al historial): actividad, franja con la clasificación normativa de cada descanso
      (diario normal / fraccionado / reducido / insuficiente, semanal normal / reducido), ▲ infracciones y detalle por día
- [x] Indicadores: semana 1, semana 2, total, ampliaciones, reducidos, disponible, infracciones y obligaciones pendientes
- [x] Generador de calendarios coherentes (`scenarios/builder.ts`) y biblioteca de escenarios (`scenarios/library.ts`):
      práctica libre, **referencia 56 h + 34 h** (gratis), semana 2: completa las 34 h, descanso semanal reducido y
      compensación, encuentra los errores (premium)
- [x] Objetivos por escenario con comprobación automática en el Informe
- [x] Escenarios guardados con límite por plan (1 gratis / 5 premium) y borrado
- [x] Informe imprimible (PDF desde el navegador) y descargable en JSON
- [x] Vista previa premium solo en el servidor de desarrollo (no existe en la versión compilada)
- [x] 77 pruebas unitarias + E2E (carga de la referencia, bloqueo premium, límite de guardados)

## Fase 2 — Motor normativo ✅ (preliminar, rama `fase-2-motor-normativo`)
- [x] Segmentación de la línea temporal en jornadas delimitadas por descansos (no por medianoche)
- [x] Descanso diario normal / fraccionado 3 + 9 / reducido / insuficiente con la ventana de 24 h (art. 8.2)
- [x] 9 h / 10 h y ampliaciones por semana, 56 h, 90 h, máximo tres diarios reducidos
- [x] Descanso semanal normal/reducido, seis periodos de 24 h, dos semanas consecutivas (art. 8.6)
- [x] Compensaciones con fecha límite; quedan pendientes aunque venzan fuera de las dos semanas
- [x] Clasificación: infracción simulada / advertencia / requiere contexto / información
- [x] Avisos del tacógrafo: ampliación, límites diario/semanal/bisemanal, hora de iniciar el descanso diario y el semanal
- [x] «Siguiente evento» se detiene en los umbrales y en los hitos de descanso (15/30/45 min, 9/11/24/45 h)
- [x] Panel «Límites normativos» (conducción disponible y factor limitante) y pantalla **Informe**
- [x] Escenario de referencia 56 h + 34 h validado por pruebas automáticas
- [x] 70 pruebas unitarias + E2E

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

## Siguiente paso: Fase 5 — Academia
- Ejercicios guiados con puntuación, progreso e insignias (los cinco gratuitos primero), reutilizando los escenarios y
  el modo asistido.
- Posible evolución visual futura: cabina en React Three Fiber (la cámara y la iluminación ya están separadas del dibujo).

## (Histórico) Plan de la Fase 2
1. ~~Obtener y archivar el texto consolidado vigente~~ (hecho: 31.12.2024). Contrastar la Directiva 2002/15/CE (disponibilidad).
2. Segmentar la línea temporal en **periodos de trabajo diarios** delimitados por descansos (11 h, 3+9, ≥9 h reducido).
3. Reglas: 9 h/10 h (contador de ampliaciones por semana), 56 h, 90 h, descansos diarios/semanales, reducciones y
   compensaciones con fecha límite (estado pendiente más allá del horizonte).
4. Escenarios de referencia con resultados esperados y tests por regla.
5. Clasificación aviso / infracción simulada / requiere contexto.
