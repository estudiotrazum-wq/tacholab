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

const REF = 'Reglamento (CE) n.º 561/2006 (texto consolidado 31.12.2024)';

export const RULES: readonly RuleDefinition[] = [
  {
    id: 'R561-ART7-CONT',
    title: 'Conducción continua máxima 4 h 30 min',
    description: 'Tras 4 h 30 min de conducción debe realizarse una pausa de al menos 45 min, salvo que se inicie un descanso.',
    reference: `${REF}, art. 7`,
    conditions: 'Se aplica a todo periodo de conducción del conductor.',
    calculation: 'Suma de conducción desde la última pausa válida (≥45 min, o ≥15 min seguida de ≥30 min).',
    severity: 'infringement',
    pedagogy: 'Otros trabajos y disponibilidad no interrumpen el contador: solo la pausa (art. 4 d: periodo que sirve exclusivamente para el reposo) o un descanso lo reinician.',
    status: 'preliminary',
    testFile: 'src/regulations/continuousDriving.test.ts',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  },
  {
    id: 'R561-ART7-SPLIT',
    title: 'Pausa fraccionada 15 + 30',
    description: 'La pausa de 45 min puede sustituirse por una de al menos 15 min seguida de otra de al menos 30 min.',
    reference: `${REF}, art. 7, párrafo primero (segunda frase)`,
    conditions: 'El orden es obligatorio: primero la fracción de 15, después la de 30.',
    calculation: 'Una pausa ≥30 min solo reinicia si antes hubo una fracción ≥15 min en el mismo periodo.',
    severity: 'infringement',
    pedagogy: 'Una pausa de 30 + 15 no es válida como pausa fraccionada.',
    status: 'preliminary',
    testFile: 'src/regulations/continuousDriving.test.ts',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  },
  ...(
    [
      ['R561-ART6-DAILY9', 'Conducción diaria 9 h', 'art. 6.1'],
      ['R561-ART6-DAILY10', 'Ampliación a 10 h hasta dos veces por semana', 'art. 6.1'],
      ['R561-ART6-WEEKLY56', 'Conducción semanal máxima 56 h', 'art. 6.2'],
      ['R561-ART6-BIWEEKLY90', 'Conducción en dos semanas consecutivas 90 h', 'art. 6.3'],
      ['R561-ART8-DR11', 'Descanso diario normal 11 h', 'art. 8.1–8.2 y art. 4 g)'],
      ['R561-ART8-DR3+9', 'Descanso diario fraccionado 3 + 9 h', 'art. 4 g)'],
      ['R561-ART8-DR9', 'Descanso diario reducido (≥9 h, máx. 3 entre descansos semanales)', 'art. 4 g) y art. 8.4'],
      ['R561-ART8-WR45', 'Descanso semanal normal 45 h', 'art. 4 h) y art. 8.6'],
      ['R561-ART8-WR24', 'Descanso semanal reducido (≥24 h): en dos semanas consecutivas, al menos dos normales o uno normal y uno reducido', 'art. 4 h) y art. 8.6'],
      ['R561-ART8-COMP', 'Compensación del descanso semanal reducido en una sola vez antes del fin de la tercera semana siguiente, unida a un descanso ≥9 h', 'art. 8.6 ter y 8.7'],
      ['R561-ART8-6DAYS', 'El descanso semanal empieza antes de que concluyan seis periodos de 24 h desde el anterior', 'art. 8.6, párrafo segundo'],
      ['R561-ART8-24H', 'Nuevo descanso diario dentro de las 24 h siguientes al fin del descanso anterior', 'art. 8.2'],
      ['R561-ART8-SPLITWEEK', 'Un descanso semanal que abarca dos semanas computa en una de ellas, no en ambas', 'art. 8.9'],
    ] as const
  ).map(([id, title, art]): RuleDefinition => ({
    id,
    title,
    description: `${title}. Implementación prevista en la Fase 2.`,
    reference: `${REF}, ${art}`,
    conditions: 'Pendiente de especificación detallada y verificación con el texto consolidado.',
    calculation: 'Pendiente.',
    severity: 'infringement',
    pedagogy: 'Pendiente.',
    status: 'planned',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  })),
  ...(
    [
      ['MOD-MULTIMANNING', 'Conducción en equipo (art. 4 o, art. 7 párr. 3, art. 8.5)'],
      ['MOD-INTL-2RWR', 'Dos descansos semanales reducidos consecutivos en transporte internacional de mercancías (art. 8.6 párr. 3)'],
      ['MOD-PASSENGERS', 'Excepciones de servicios discrecionales de viajeros (arts. 7 y 8.2 bis, 8.6 bis; no aplican a mercancías)'],
      ['MOD-FERRY-TRAIN', 'Transbordador o tren'],
      ['MOD-ART12', 'Circunstancias excepcionales (art. 12)'],
      ['MOD-NATIONAL', 'Excepciones nacionales (art. 13) y ámbito de aplicación (arts. 2 y 3)'],
    ] as const
  ).map(([id, title]): RuleDefinition => ({
    id,
    title,
    description: `${title}. Módulo separado, desactivado hasta su validación.`,
    reference: REF,
    conditions: 'Módulo desactivado.',
    calculation: 'No implementado.',
    severity: 'needs-context',
    pedagogy: 'Su evaluación requiere contexto adicional.',
    status: 'disabled-module',
    textCheckedAgainst: SOURCE_VERSION,
    legallyVerified: false,
  })),
];
