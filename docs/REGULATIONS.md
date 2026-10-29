# Catálogo normativo

## Fuente y estado de verificación
- **Texto contrastado:** Reglamento (CE) 561/2006, versión consolidada en español **02006R0561-20241231**
  (la más reciente según el servicio SPARQL de la Oficina de Publicaciones de la UE, consultado el 29/10/2026).
  Incluye las modificaciones de los Reglamentos (UE) 165/2014, 2020/1054 (Paquete de Movilidad) y 2024/1258.
  Extracto archivado: [`normativa/R561-2006_consolidado-20241231_art4-8.txt`](normativa/R561-2006_consolidado-20241231_art4-8.txt).
- La versión consolidada es un instrumento de documentación sin efecto jurídico; el texto auténtico es el del DOUE.
- **Contrastado ≠ validado jurídicamente.** Las referencias y umbrales coinciden con el texto; las *interpretaciones*
  marcadas abajo siguen pendientes de revisión profesional (`legallyVerified: false` en todas las reglas).
- Pendiente de contrastar: Reglamento (UE) 165/2014 (tacógrafos), Reglamento de Ejecución (UE) 2016/799 (anexo IC),
  Directiva 2002/15/CE (tiempo de trabajo y disponibilidad) y normativa sancionadora española.

Zona de cálculo: **UTC** (decisión de producto). El art. 4 i) define la semana como «el período de tiempo comprendido
entre las 00.00 del lunes y las 24.00 del domingo» sin fijar zona horaria; se usa UTC porque es como registran los
tacógrafos digitales. Pendiente de confirmación profesional.

La definición formal (id, descripción, referencia, condiciones, cálculo, gravedad, pedagogía, estado, test) está en
`src/regulations/rules.ts`.

## Implementadas (preliminares)

### R561-ART7-CONT — Conducción continua 4 h 30
- Cálculo: suma de `DRIVING` desde la última pausa válida.
- Pausa válida: bloque `REST` continuo ≥ 45 min; o bloque ≥ 15 min seguido, más tarde, de bloque ≥ 30 min.
- `WORK` y `AVAILABILITY` no suman conducción ni reinician.
- Bloques `REST` contiguos se fusionan; un hueco sin registro rompe la continuidad.
- Avisos: 4 h 15 (preventivo) y 4 h 30 (infracción simulada), con instante exacto.
- Tests: `src/regulations/continuousDriving.test.ts`, `src/simulator/engine.test.ts`.

### R561-ART7-SPLIT — Pausa fraccionada 15 + 30
- El orden importa: 30 + 15 no reinicia. Probado.

**Comprobación con el texto (art. 7):** «Tras un período de conducción de cuatro horas y media, el conductor hará una
pausa ininterrumpida de al menos 45 minutos, a menos que tome un período de descanso. Podrá sustituirse dicha pausa por
una pausa de al menos 15 minutos seguida de una pausa de al menos 30 minutos […]». Coincide con la implementación,
incluido el orden 15 → 30.

**Interpretaciones pendientes de revisión profesional:**
- (a) *Disponibilidad no es pausa.* Apoyo textual: art. 4 d) define «pausa» como periodo sin conducción ni otro trabajo
  «que sirva exclusivamente para su reposo»; la disponibilidad (art. 3 b de la Directiva 2002/15/CE, citado en el art. 6.5)
  es un registro distinto. La Directiva 2002/15/CE no se ha contrastado todavía.
- (b) *Periodos sin tarjeta y sin entrada manual no son pausa.* Criterio prudente propio: el art. 6.5 obliga a registrar
  manualmente otros trabajos y disponibilidad; el texto no regula cómo valorar un periodo no declarado.
- (c) *Un descanso cuenta como pausa en cuanto alcanza 45 min.* Coherente con «a menos que tome un período de descanso»
  (art. 7), puesto que todo descanso válido dura más de 45 min.

## Implementadas en la Fase 2 (preliminares) — `src/regulations/compliance.ts`
Pruebas: `src/regulations/compliance.test.ts` (incluye el escenario de referencia 56 h + 34 h = 90 h, sin infracciones,
y su variante con una hora más, que supera las 90 h).

**Supuestos de cálculo** (a revisar profesionalmente):
1. Días y semanas en UTC.
2. El escenario empieza tras un descanso semanal normal que termina a la hora de inicio, y la semana anterior no tiene
   conducción (afecta al límite de 90 h y al plazo de seis periodos de 24 h).
3. Descanso ininterrumpido ≥ 24 h ⇒ descanso semanal; ≥ 9 h ⇒ diario; de 3 h a 9 h ⇒ posible primera parte de un 3 + 9.
4. La ampliación a 10 h se imputa a la semana UTC en la que empieza la jornada.
5. La compensación puede ir unida a un descanso diario (se compensa lo que excede de 9 h) o a un semanal normal (lo que
   excede de 45 h), en una sola vez; un descanso semanal reducido no puede llevarla.
6. Los huecos sin registro no son descanso.
7. Al llegar exactamente a un límite (4 h 30, 9/10 h, 56 h, 90 h) el equipo avisa; la infracción simulada se registra
   solo si se sigue conduciendo.

### Referencias contrastadas
| Regla | Texto (resumen) | Artículo |
|---|---|---|
| Conducción diaria | ≤ 9 h; hasta 10 h no más de dos veces por semana | 6.1 |
| Tiempo diario de conducción | entre el final de un descanso diario y el principio del siguiente (o el semanal) | 4 k) |
| Conducción semanal | ≤ 56 h (sin superar el tiempo de trabajo de la Directiva 2002/15/CE) | 6.2, 4 l) |
| Dos semanas consecutivas | ≤ 90 h | 6.3 |
| Descanso diario normal | ≥ 11 h, o 3 h + 9 h ininterrumpidas (en ese orden) | 4 g) |
| Descanso diario reducido | ≥ 9 h y < 11 h; máximo tres entre dos descansos semanales | 4 g), 8.4 |
| Ventana de 24 h | nuevo descanso diario en las 24 h siguientes al fin del descanso anterior; si la parte dentro de las 24 h está entre 9 y 11 h, es reducido | 8.2 |
| Descanso semanal | normal ≥ 45 h; reducido ≥ 24 h; en dos semanas consecutivas, dos normales o uno normal + uno reducido | 4 h), 8.6 |
| Inicio del descanso semanal | antes de que concluyan seis periodos de 24 h desde el fin del anterior | 8.6 párr. 2 |
| Compensación | equivalente, en una sola vez, antes del fin de la tercera semana siguiente; unida a otro descanso ≥ 9 h | 8.6 ter, 8.7 |
| Semana que se solapa | un descanso semanal que abarca dos semanas computa en cualquiera de ellas, no en ambas | 8.9 |
| Lugar del descanso | el descanso semanal normal (y el > 45 h de compensación) no puede tomarse en el vehículo | 8.8 |

Consecuencia para el horizonte de 14 días: una compensación por un descanso semanal reducido en la semana 2 vence al
final de la **semana 5**, fuera del escenario. Se mostrará como obligación *pendiente* con su fecha límite (art. 8.6 ter).

Requisitos de diseño para la Fase 2:
- El tiempo de conducción diario se delimita por descansos, no por medianoche.
- Las obligaciones de compensación se modelan con fecha límite y estado `pendiente` más allá del horizonte de 14 días.
- Diferenciar *aviso*, *infracción simulada* y *requiere contexto*.

## Pendiente
- Art. 8.8 (lugar del descanso semanal): requiere un dato de ubicación que el simulador no registra.
- Asignación óptima de descansos que abarcan dos semanas (art. 8.9): ahora se cuenta cada uno una vez, sin optimizar.

## Módulos separados (desactivados)
Conducción en equipo (arts. 4 o, 7, 8.5), dos descansos semanales reducidos consecutivos en transporte internacional
(art. 8.6 párr. 3), excepciones de servicios discrecionales de viajeros (Reglamento 2024/1258; no aplican a mercancías),
transbordador/tren, art. 12 (circunstancias excepcionales), art. 13 (excepciones nacionales).
