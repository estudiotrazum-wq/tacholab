# Progreso del proyecto

Última actualización: 29/10/2026 — Fase 1 + v0.2.

## v0.19 — Amplitud de la jornada (13 h / 15 h) a la vista (rama `ui-rediseno`)
- [x] Nueva pantalla del tacógrafo (▼ ×3): **Jornada 13h** (tiempo que queda para empezar el descanso diario normal
      de 11 h dentro de las 24 h) y **Reducida 15h** (con descanso reducido de 9 h, mientras queden reducidos). Art. 8.2
- [x] Barra de control: bloque **«Te queda»** siempre visible: hasta la pausa, conducción de hoy, jornada 13 h,
      jornada 15 h y conducción de la semana, con colores de aviso (ámbar < 30 min, rojo agotado)
- [x] Guía: norma de amplitud de jornada; tutorial: mención de la nueva pantalla
- [x] 145 pruebas unitarias + E2E

## v0.18 — Interfaz modernizada: fondo de atlas, llave nueva y temas de pantalla (rama `ui-rediseno`)
- [x] **Fondo «atlas de carreteras»** nocturno (diseño propio): península ibérica, sur de Francia y noroeste de
      Italia con relieve, costa iluminada, fronteras, autovías con su denominación, ciudades y rotulación de mares.
      La ruta Madrid → Lyon va resaltada y el **camión avanza por ella según el cuentakilómetros**; animación
      desactivada si el sistema pide reducir el movimiento. Opción «Liso» en Ajustes → Apariencia
- [x] **Llave de contacto moderna**: mando rotativo con bisel, llave de tipo mando a distancia con LED de estado y
      anillo de LED por posición (0 gris · I ámbar · II verde); botones segmentados con el color de cada estado
- [x] **Temas de la pantalla del tacógrafo**: clásica (LCD verde), nocturna (texto claro sobre fondo oscuro) y
      ámbar, con vista previa en Ajustes
- [x] Tarjetas de cristal más opacas para leer bien sobre el mapa
- [x] 144 pruebas unitarias + E2E

## v0.17 — Manejo más realista a partir de un manual de usuario de tacógrafo (rama `ui-rediseno`)
Referencia de manejo: manual de usuario de un tacógrafo digital de 2.ª generación (enlace aportado por el usuario,
no se incluye en el repositorio). Se toma solo el modelo de interacción; textos, pictogramas y diseño son propios.
- [x] **Pantallas** con ▲ ▼: estándar (hora local, modo, velocidad; tarjeta y actividad del conductor 1,
      cuentakilómetros y conductor 2) → tiempos del conductor (req. 160) → tiempo restante → acumulados → UTC/local
- [x] **Bienvenida** con nombre, hora local y hora UTC; **última retirada** en hora local
- [x] **Avisos de pausa** «1 ¡Pausa!» con la conducción continua y el descanso acumulado
- [x] **Entrada manual**: tras los tramos se pide el **país de comienzo** (y comunidad) y después **¿Confirmar?**
- [x] **País propuesto**: el último introducido aparece primero
- [x] **Menú de dos niveles**, solo con el vehículo parado: Imprimir conduc.1 (24h act. diaria) · Entrada conduc.1
      (país comienzo, país final, cruce frontera) · Entrada vehículo (OUT, ferry/tren) · Visualizar cond.1
      (24h act. diaria, tiempos, resumen) · Información equipo
- [x] Corrección: la pantalla estándar mostraba la hora UTC con el símbolo de hora local
- [x] 140 pruebas unitarias + E2E

## v0.16 — Reloj más rápido y motor más suave (rama `ui-rediseno`)
- [x] Velocidades del reloj ×300 (5 min/s), ×900 (15 min/s) y ×3600 (1 h/s): las 4 h 30 se alcanzan en segundos.
      Desde ×300, el reloj **se pausa solo** en el instante exacto de cada aviso nuevo para poder reaccionar
- [x] Sonido del motor rehecho: fundamental senoidal, armónico y subgrave suaves, rumor filtrado, paso bajo sin
      resonancia, pulsación mínima, cambios de régimen más lentos, turbo y freno de aire discretos y con fundido
- [x] Volumen propio del motor en «Sonido» (50 % por defecto)
- [x] 134 pruebas unitarias + E2E

## v0.15 — Reinicio de jornada, frontera, ferry/tren, pantalla normativa y sonido (rama `ui-rediseno`)
- [x] **Reiniciar** (barra de control): «Repetir la jornada» vuelve a justo antes de la última inserción de tarjeta
      (estado guardado automáticamente) y «Empezar de cero» borra las dos semanas; en un ejercicio, «Repetir el
      ejercicio». Si el tutorial está en curso, vuelve a empezar
- [x] **Pantalla por defecto** según el requisito 160 del anexo IC (R. 2016/799): hora local, modo de funcionamiento
      (pictograma propio), velocidad; conductor 1 con conducción continua y descanso acumulado (o, si no conduce,
      duración de la actividad actual) y conductor 2. Texto escalado al ancho del visor
- [x] **Cruce de frontera** (menú «País: cruce frontera», art. 34.7 R. 165/2014), con comunidad autónoma en España
- [x] **Condiciones específicas** (req. 62): «Ferry/tren» (inicio/fin, solo con el vehículo parado; se cierra al
      extraer la tarjeta o, como aproximación, al volver a circular) y «Fuera de ámbito» (se cierra al insertar o
      extraer la tarjeta; sin avisos de conducción continua ni de conducción sin tarjeta). Pictograma en pantalla
      (req. 164) y registro
- [x] **Art. 9 R. 561/2006** en el motor normativo: con un trayecto en ferry/tren registrado, hasta dos
      interrupciones del descanso (≤ 1 h en total) no lo rompen si suma ≥ 11 h; hallazgo informativo `R561-ART9-FERRY`
- [x] **Sonido** sintetizado con Web Audio (sin grabaciones): pitido de teclas, tarjeta, impresora, avisos, llave,
      motor diésel (arranque, ralentí, régimen según velocidad, turbo al acelerar, freno de aire) y música country
      original «Ruta 561» (desactivada por defecto). Botón «Sonido» con volúmenes
- [x] Extractos normativos verificados en `docs/normativa/` (art. 34 R. 165/2014, art. 9 R. 561/2006, req. 62 y
      160-164 del anexo IC)
- [x] 132 pruebas unitarias + E2E (frontera, ferry, reinicios, música)
- Nota: el vídeo de referencia de YouTube no se puede reproducir desde el entorno de desarrollo; la pantalla se ha
  ajustado al contenido que exige el reglamento, común a todos los fabricantes

## v0.14 — Tiempo restante en el tacógrafo y comunidad autónoma (rama `ui-rediseno`)
- [x] Nueva pantalla estándar (▼ desde la principal): **conducción restante hasta la pausa** y **hasta el fin de la
      jornada**; después acumulados y hora UTC/local
- [x] Paso 11 del tutorial rehecho: «¿Cuánto te queda de conducción?» se completa pulsando ▼ en el tacógrafo y aclara
      que el panel «Te limita» es una ayuda del simulador, no del equipo. Los pasos de país resaltan pantalla + teclas
- [x] **Comunidad autónoma** al elegir España como país de inicio, de fin o de fin de la jornada anterior (✕ vuelve al
      país); queda en el registro: «País de inicio: España (Madrid)». Códigos verificados con el R. (UE) 2016/799
- [x] Academia, ayudas, guía y pruebas actualizadas: 119 pruebas unitarias + E2E

## v0.13 — Tutorial menos invasivo y nombre propio en la tarjeta (rama `ui-rediseno`)
- [x] La tarjeta del tutorial busca un hueco que **no tape la pieza señalada ni el tacógrafo** (debajo, encima, a los
      lados o en una esquina); si no cabe (p. ej. en móvil), se **minimiza** a una barra con el título del paso, que se
      puede desplegar. Botón «Minimizar» en cualquier paso y oscurecido más suave
- [x] **Tu nombre en la tarjeta ficticia**: en la bienvenida, en el primer paso del tutorial, en la bandeja («Poner mi
      nombre en esta tarjeta») y en Ajustes («Tu tarjeta»). Aparece en la bandeja, la bienvenida del tacógrafo y los
      tickets; se mantiene al reiniciar o cargar escenarios. Se guarda solo en el navegador y se puede borrar
- [x] Acción `RENAME_CARD` con validación (1–18 letras, espacios, guion, apóstrofo); el identificador sigue siendo
      ficticio (`SIM-…`)
- [x] 118 pruebas unitarias (colocación de la tarjeta, nombres) + E2E que comprueba en cada paso que el tutorial no
      tapa la pantalla ni las teclas

## v0.12 — Tutorial de inicio y guía (rama `ui-rediseno`)
- [x] **Tutorial interactivo** de 16 pasos sobre el simulador real: oscurece la pantalla salvo la pieza del paso,
      explica qué hacer y avanza solo cuando el alumno lo hace (tarjeta, bienvenida, última retirada, país, llave I y
      II, acelerador, tiempo, lectura de pantalla, parada, tecla de actividad, ⏏, país de fin e impresión).
      Atrás / Saltar / Salir; si se cambia de pantalla, invita a volver al Panel
- [x] Se ofrece en la bienvenida («Empezar el tutorial» o «Explorar por mi cuenta») y con un aviso en el panel
      hasta completarlo o descartarlo; se repite desde **Guía** en el menú
- [x] **Guía rápida de consulta**: piezas del tacógrafo, empezar la jornada, entradas manuales, actividades y
      pictogramas, terminar la jornada, manejo del tiempo, normas básicas con su artículo del R. (CE) 561/2006 y atajos
- [x] El interruptor de ayudas contextuales pasa a llamarse «Ayudas» para no confundirlo con la guía
- [x] Pasos del tutorial como lógica pura (`src/tutorial/steps.ts`) probados con el motor: 113 pruebas unitarias +
      E2E que completa el tutorial con clics reales

## v0.11 — Extracción de tarjeta como en los equipos reales (rama `ui-rediseno`)
- [x] **Botón ⏏ de expulsión** junto a cada ranura (con piloto de tarjeta insertada) y **pulsación larga de la tecla 1**
      con barra de progreso, como alternativa habitual en los tacógrafos digitales
- [x] Retirada completa: **país de fin** → **¿Imprimir 24 h?** (SÍ/NO) → la tarjeta **asoma por la ranura** y vuelve a
      la bandeja. ✕ en «¿Imprimir?» vuelve al país; ✕ en el país cancela la retirada. Con el vehículo en marcha no se
      puede retirar
- [x] La impresión pasa al motor (`PRINT_DAILY`, `device.printout`, registro `PRINTOUT`): el ticket es el mismo desde
      la impresora o al retirar la tarjeta
- [x] 109 pruebas unitarias + E2E con pulsación larga, cancelación, botón ⏏, impresión y expulsión

## v0.10 — Procedimiento de inserción real y llave de contacto (rama `ui-rediseno`)
- [x] Secuencia de inserción como en los tacógrafos digitales europeos: **bienvenida** (titular y hora local) →
      **última retirada** de la tarjeta (fecha y hora UTC) → **¿entrada manual?** → entradas manuales campo a campo
      (actividad → hora → minutos, varios tramos) → **país de fin de la jornada anterior** → **confirmar** →
      **país de inicio** → «Listo para conducir». ✕ retrocede un paso en cada pantalla
- [x] **Llave de contacto** con posiciones 0 · I · II junto al tacógrafo, a su misma altura (encima en móvil). Con la
      llave en 0 la pantalla pierde la retroiluminación; en II arranca el motor (vuelve sola a I). Tecla `K`
- [x] El acelerador sustituye al botón ARRANCAR/PARAR: sin motor arrancado no mueve el camión («Arranque el motor con
      la llave»); quitar el contacto detiene el vehículo. Los giros de llave quedan en el registro
- [x] Ejercicio 2 de la academia rehecho con los 8 pasos del procedimiento; ayudas contextuales para cada pantalla
- [x] 105 pruebas unitarias + E2E con la llave (0 → I → II) y el procedimiento completo
- Modelo de interacción común a los equipos del mercado; textos, pictogramas y diseño propios (sin imitar ninguna marca)

## v0.9 — Tacógrafo más realista y barra de control con deslizadores (rama `ui-rediseno`)
- [x] Aparato en formato DIN con los elementos comunes a los tacógrafos digitales europeos: **LCD de 2 × 20** con
      retroiluminación y pictogramas normalizados, teclas ✕ ▲ ▼ OK, **dos ranuras** con tecla 1/2 (tecla 1: actividad;
      mantener pulsada: expulsar) e **impresora** que saca el ticket diario. Diseño propio, sin imitar ninguna marca
- [x] Ranura 2 (segundo conductor) visible e informa de que la conducción en equipo llegará más adelante
- [x] Barra de control bajo el aparato: **línea de tiempo de 14 días** que se arrastra para avanzar (pasos de 15 min,
      nunca hacia atrás; teclado: → +15 min, ↑ +1 h, AvPág +1 día), **velocidad del reloj** y **velocidad del camión**
      (0–90 km/h, limitador UE)
- [x] Velocidad del camión y cuentakilómetros en el motor (`SET_VEHICLE_SPEED`, distancia integrada al avanzar el tiempo)
- [x] Fuente de matriz de puntos VT323 (OFL) incluida en la aplicación
- [x] 103 pruebas unitarias + E2E con deslizadores, arrastre de la línea de tiempo e impresión

## v0.8 — Simulador en una sola pantalla
- [x] La app abre directamente en el simulador; bienvenida con los tres pasos (tarjeta, arrancar, tiempo)
- [x] Panel único: tarjetas ficticias a la izquierda (se **arrastran a la ranura** o se pulsan), tacógrafo y barra de
      tiempo en el centro, velocímetro con cuentakilómetros y botón **ARRANCAR/PARAR** y estado a la derecha
- [x] Menú lateral (Simulador · Mis semanas · Academia; guía sí/no, Premium, Ajustes); pestañas inferiores en móvil
- [x] La cabina pasa a ser una vista opcional del simulador
- [x] Confirmaciones dentro de la app (sin `window.confirm`)
- [x] Inspirado en el modelo de interacción de los simuladores de formación (vídeo de referencia del usuario), con
      diseño propio: no reproduce el aspecto, las pantallas ni los iconos de ningún fabricante

## v0.7 — Interfaz simplificada y moderna
- [x] Navegación en 4 secciones: Inicio · Conducir (Cabina / Tacógrafo) · Mis semanas (Calendario / Informe) ·
      Academia (Ejercicios / Escenarios); Premium y Ajustes como iconos; barra de pestañas inferior en móvil
- [x] Barra de control única, al estilo de un reproductor: reloj, reproducir/pausa, velocidad, siguiente, arrancar/detener;
      lo avanzado (+15 min, +1 h, avanzar hasta, puntos de restauración) en «Más»
- [x] Tarjeta de estado única: «puedes conducir» con anillo, factor limitante, cuatro medidores y próximos descansos;
      tabla de acumulados plegada en «Ver detalle»
- [x] Fondo con brillos y retícula sutil, tarjetas de cristal, tipografía Inter incluida en la aplicación (sin Google Fonts)
- [x] Inicio nuevo con vista previa en vivo del tacógrafo y «Continuar donde lo dejaste»
- [x] Academia agrupada en iniciales / avanzados / próximamente
- [x] E2E actualizada a la nueva navegación (en verde)

## Fase 5 — Academia ✅ (rama `fase-5-academia`)
- [x] Modelo de ejercicio: objetivo, situación inicial, estado del tacógrafo, instrucciones opcionales paso a paso,
      condiciones de éxito, errores detectables con penalización y norma, puntuación (0–100, 0–3 estrellas) y explicación final
- [x] Seguimiento puro (`academy/session.ts`): observa la simulación, acumula hechos y avanza los pasos en orden
- [x] Ejercicios funcionales: 1–5 (gratuitos) y 6, 12, 14, 15 (premium; el 15 es un cuestionario sobre un historial)
- [x] Ejercicios 7–11, 13 y 16 visibles como «Próximamente» (sin simular que funcionan)
- [x] Las instrucciones se pueden ocultar (modo libre) y resaltan el control del paso actual en el tacógrafo y en la cabina
- [x] Progreso y mejor resultado guardados; 10 insignias de aprendizaje sin rachas ni recompensas por infringir
- [x] Un ejercicio con infracciones no se aprueba
- [x] 99 pruebas unitarias (cada ejercicio resuelto bien y mal con el simulador real) + E2E del ejercicio 1
- [ ] Certificado privado de finalización (no oficial): pendiente (Fase 6, junto con las cuentas)

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

## Siguiente paso: Fase 6 — Comercialización
- Cuentas opcionales y sincronización (Supabase), validación de premium en servidor, Stripe en modo pruebas,
  páginas legales, analítica respetuosa con la privacidad y despliegue público.
- Completar los ejercicios premium 7–11, 13 y 16 y el certificado no oficial.

## (Histórico) Plan de la Fase 2
1. ~~Obtener y archivar el texto consolidado vigente~~ (hecho: 31.12.2024). Contrastar la Directiva 2002/15/CE (disponibilidad).
2. Segmentar la línea temporal en **periodos de trabajo diarios** delimitados por descansos (11 h, 3+9, ≥9 h reducido).
3. Reglas: 9 h/10 h (contador de ampliaciones por semana), 56 h, 90 h, descansos diarios/semanales, reducciones y
   compensaciones con fecha límite (estado pendiente más allá del horizonte).
4. Escenarios de referencia con resultados esperados y tests por regla.
5. Clasificación aviso / infracción simulada / requiere contexto.
