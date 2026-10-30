import { N_ } from '@/i18n';
/**
 * Catálogo de reglas normativas. Cada regla documenta su referencia y su estado.
 *
 * Las referencias se han contrastado con el texto consolidado oficial en español
 * 02006R0561-20241231 (extracto archivado en docs/normativa/). Contrastar el texto
 * NO equivale a validación jurídica: las interpretaciones siguen pendientes de
 * revisión profesional antes de un lanzamiento comercial. Ver docs/REGULATIONS.md.
 */

/** Versión consolidada del Reglamento (CE) 561/2006 contra la que se han revisado las referencias. */
export const SOURCE_VERSION = '02006R0561-20241231';

export type RuleSeverity = 'info' | 'warning' | 'infringement' | 'needs-context';
export type RuleStatus = 'preliminary' | 'planned' | 'disabled-module';

export interface RuleDefinition {
  id: string;
  title: string;
  description: string;
  reference: string;
  /** Artículo (cuando la referencia es «REF, artículo»): permite traducir la referencia por partes. */
  article?: string;
  conditions: string;
  calculation: string;
  severity: RuleSeverity;
  pedagogy: string;
  status: RuleStatus;
  /** Ruta del test automático que la cubre (si existe). */
  testFile?: string;
  /** Referencia y redacción contrastadas con el texto consolidado SOURCE_VERSION. */
  textCheckedAgainst: typeof SOURCE_VERSION;
  /** Interpretación revisada por un profesional jurídico. */
  legallyVerified: false;
}

export const REF = N_('Reglamento (CE) n.º 561/2006 (texto consolidado 31.12.2024)');

export const RULES: readonly RuleDefinition[] = [
  {
    id: 'R561-ART7-CONT',
    title: N_('Conducción continua máxima 4 h 30 min'),
    description: N_('Tras 4 h 30 min de conducción debe realizarse una pausa de al menos 45 min, salvo que se inicie un descanso.'),
    reference: N_('Reglamento (CE) n.º 561/2006 (texto consolidado 31.12.2024), art. 7'),
    conditions: N_('Se aplica a todo periodo de conducción del conductor.'),
    calculation: N_('Suma de conducción desde la última pausa válida (≥45 min, o ≥15 min seguida de ≥30 min).'),
    severity: 'infringement',
    pedagogy: N_('Otros trabajos y disponibilidad no interrumpen el contador: solo la pausa (art. 4 d: periodo que sirve exclusivamente para el reposo) o un descanso lo reinician.'),
    status: 'preliminary',
    testFile: 'src/regulations/continuousDriving.test.ts',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  },
  {
    id: 'R561-ART7-SPLIT',
    title: N_('Pausa fraccionada 15 + 30'),
    description: N_('La pausa de 45 min puede sustituirse por una de al menos 15 min seguida de otra de al menos 30 min.'),
    reference: N_('Reglamento (CE) n.º 561/2006 (texto consolidado 31.12.2024), art. 7, párrafo primero (segunda frase)'),
    conditions: N_('El orden es obligatorio: primero la fracción de 15, después la de 30.'),
    calculation: N_('Una pausa ≥30 min solo reinicia si antes hubo una fracción ≥15 min en el mismo periodo.'),
    severity: 'infringement',
    pedagogy: N_('Una pausa de 30 + 15 no es válida como pausa fraccionada.'),
    status: 'preliminary',
    testFile: 'src/regulations/continuousDriving.test.ts',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  },
  ...(
    [
      ['R561-ART6-DAILY9', N_('Conducción diaria 9 h'), N_('art. 6.1 y art. 4 k)'),
        N_('Conducción entre el fin de un descanso diario o semanal y el inicio del siguiente (no por medianoche).'),
        N_('Una jornada nocturna que cruza la medianoche es una sola jornada.')],
      ['R561-ART6-DAILY10', N_('Ampliación a 10 h hasta dos veces por semana'), N_('art. 6.1'),
        N_('Jornadas con más de 9 h cuentan como ampliación en la semana UTC en que empiezan; más de 10 h o una tercera ampliación es infracción.'),
        N_('Las ampliaciones no se acumulan: si no las usas, se pierden al acabar la semana.')],
      ['R561-ART6-WEEKLY56', N_('Conducción semanal máxima 56 h'), N_('art. 6.2 y art. 4 i), l)'),
        N_('Suma de conducción entre lunes 00:00 y domingo 24:00 UTC.'),
        N_('56 h solo son posibles con las dos ampliaciones y seis jornadas.')],
      ['R561-ART6-BIWEEKLY90', N_('Conducción en dos semanas consecutivas 90 h'), N_('art. 6.3'),
        N_('Suma de las dos semanas del escenario (la semana anterior se supone sin conducción).'),
        N_('Si conduces 56 h en una semana, la siguiente solo puedes conducir 34 h.')],
      ['R561-ART8-DR11', N_('Descanso diario normal 11 h'), N_('art. 4 g) y art. 8.2'),
        N_('Bloque de descanso ininterrumpido con al menos 11 h dentro de la ventana de 24 h de la jornada.'),
        N_('Lo que cuenta es la parte del descanso que cae dentro de las 24 h desde el fin del descanso anterior.')],
      [N_('R561-ART8-DR3+9'), N_('Descanso diario fraccionado 3 + 9 h'), N_('art. 4 g)'),
        N_('Bloque de 3 h a 9 h seguido, en la misma jornada, de un bloque de al menos 9 h; ambos dentro de la ventana de 24 h.'),
        N_('El orden es obligatorio: 9 + 3 no es un descanso fraccionado (el de 9 h cuenta como reducido).')],
      ['R561-ART8-DR9', N_('Descanso diario reducido (≥ 9 h, máx. 3 entre descansos semanales)'), N_('art. 4 g) y art. 8.4'),
        N_('Parte dentro de la ventana entre 9 h y 11 h; el cuarto reducido desde el último descanso semanal es infracción.'),
        N_('Los reducidos no se compensan, pero están limitados a tres.')],
      ['R561-ART8-24H', N_('Nuevo descanso diario dentro de las 24 h siguientes al fin del descanso anterior'), N_('art. 8.2'),
        N_('Si dentro de la ventana hay menos de 9 h de descanso (o ya no cabe), infracción en el último instante válido de inicio.'),
        N_('Planifica: para 11 h de descanso, empieza como tarde 13 h después de terminar el descanso anterior.')],
      ['R561-ART8-WR45', N_('Descanso semanal normal 45 h'), N_('art. 4 h) y art. 8.6'),
        N_('Bloque de descanso ininterrumpido de al menos 45 h.'),
        N_('Un descanso diario puede ampliarse hasta convertirse en semanal (art. 8.3).')],
      ['R561-ART8-WR24', N_('En dos semanas consecutivas: dos descansos semanales normales, o uno normal y uno reducido (≥ 24 h)'), N_('art. 4 h) y art. 8.6'),
        N_('Descansos ≥ 24 h que se solapan con las dos semanas del escenario; un descanso en curso al final se marca como «requiere contexto».'),
        N_('Un descanso que abarca dos semanas computa en cualquiera de ellas, pero no en ambas (art. 8.9).')],
      ['R561-ART8-COMP', N_('Compensación del descanso semanal reducido'), N_('art. 8.6 ter y 8.7'),
        N_('45 h menos la duración del reducido, en una sola vez, unida a un descanso ≥ 9 h (o semanal normal), antes del fin de la tercera semana siguiente.'),
        N_('La obligación sigue pendiente aunque termine la simulación de dos semanas.')],
      ['R561-ART8-6DAYS', N_('El descanso semanal empieza antes de que concluyan seis periodos de 24 h desde el anterior'), N_('art. 8.6, párrafo segundo'),
        N_('Inicio del siguiente bloque ≥ 24 h a más tardar 144 h después del fin del descanso semanal anterior.'),
        N_('No es «uno por semana natural»: se cuenta desde el final del descanso semanal anterior.')],
    ] as const
  ).map(([id, title, art, calculation, pedagogy]): RuleDefinition => ({
    id,
    title,
    description: title,
    reference: `${REF}, ${art}`,
    article: art,
    conditions: N_('Conductor único, transporte de mercancías, sin excepciones. Días y semanas en UTC.'),
    calculation,
    severity: 'infringement',
    pedagogy,
    status: 'preliminary',
    testFile: 'src/regulations/compliance.test.ts',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  })),
  {
    id: 'R561-ART8-SPLITWEEK',
    title: N_('Un descanso semanal que abarca dos semanas computa en una de ellas, no en ambas'),
    description: N_('Asignación de descansos semanales a semanas.'),
    reference: N_('Reglamento (CE) n.º 561/2006 (texto consolidado 31.12.2024), art. 8.9'),
    conditions: N_('Descansos semanales que cruzan el lunes 00:00 UTC.'),
    calculation: N_('Implementado de forma simplificada dentro de R561-ART8-WR24 (cada descanso cuenta una vez).'),
    severity: 'info',
    pedagogy: N_('Puedes elegir en qué semana cuenta, pero solo en una.'),
    status: 'preliminary',
    testFile: 'src/regulations/compliance.test.ts',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  },
  {
    id: 'R561-ART8-PLACE',
    title: N_('El descanso semanal normal no puede tomarse en el vehículo'),
    description: N_('Lugar del descanso semanal normal y de los de más de 45 h de compensación.'),
    reference: N_('Reglamento (CE) n.º 561/2006 (texto consolidado 31.12.2024), art. 8.8'),
    conditions: N_('Requiere conocer dónde se descansa.'),
    calculation: N_('No implementado: el simulador no registra el lugar del descanso.'),
    severity: 'needs-context',
    pedagogy: N_('Debe ser en un alojamiento adecuado, a cargo del empresario.'),
    status: 'planned',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  },
  ...(
    [
      ['MOD-MULTIMANNING', N_('Conducción en equipo (art. 4 o, art. 7 párr. 3, art. 8.5)')],
      ['MOD-INTL-2RWR', N_('Dos descansos semanales reducidos consecutivos en transporte internacional de mercancías (art. 8.6 párr. 3)')],
      ['MOD-PASSENGERS', N_('Excepciones de servicios discrecionales de viajeros (arts. 7 y 8.2 bis, 8.6 bis; no aplican a mercancías)')],
      ['MOD-FERRY-TRAIN', N_('Transbordador o tren')],
      ['MOD-ART12', N_('Circunstancias excepcionales (art. 12)')],
      ['MOD-NATIONAL', N_('Excepciones nacionales (art. 13) y ámbito de aplicación (arts. 2 y 3)')],
    ] as const
  ).map(([id, title]): RuleDefinition => ({
    id,
    title,
    description: N_('Módulo separado, desactivado hasta su validación.'),
    reference: REF,
    conditions: N_('Módulo desactivado.'),
    calculation: N_('No implementado.'),
    severity: 'needs-context',
    pedagogy: N_('Su evaluación requiere contexto adicional.'),
    status: 'disabled-module',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  })),
];
