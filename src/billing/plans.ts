/**
 * Arquitectura de permisos por funcionalidad (feature flags comerciales).
 *
 * En la Fase 1 todo usuario es FREE y no existe ningún flujo de pago.
 * La comprobación local solo sirve para la interfaz: el acceso real a contenido
 * premium deberá validarse en servidor (Supabase + webhook de Stripe) en la Fase 6.
 */
export type FeatureKey =
  | 'cabin'
  | 'tachograph'
  | 'time-acceleration'
  | 'active-scenario'
  | 'basic-summary'
  | 'essential-warnings'
  | 'academy-basic'
  | 'academy-advanced'
  | 'complex-scenarios'
  | 'detailed-evaluation'
  | 'extended-reports'
  | 'scenario-library'
  | 'multi-save'
  | 'visual-customization'
  | 'completion-certificate';

export type PlanId = 'free' | 'premium';

export const PLAN_FEATURES: Record<PlanId, readonly FeatureKey[]> = {
  free: ['cabin', 'tachograph', 'time-acceleration', 'active-scenario', 'basic-summary', 'essential-warnings', 'academy-basic'],
  premium: [
    'cabin', 'tachograph', 'time-acceleration', 'active-scenario', 'basic-summary', 'essential-warnings', 'academy-basic',
    'academy-advanced', 'complex-scenarios', 'detailed-evaluation', 'extended-reports', 'scenario-library',
    'multi-save', 'visual-customization', 'completion-certificate',
  ],
};

/** Hipótesis comercial modificable sin cambios de código en la lógica. */
export const PRICING = {
  premium: { amountCents: 1299, currency: 'EUR', kind: 'one_time' as const, active: false },
} as const;

/** Límites por plan (escenarios guardados). */
export const PLAN_LIMITS: Record<PlanId, { savedScenarios: number }> = {
  free: { savedScenarios: 1 },
  premium: { savedScenarios: 5 },
};

export interface Entitlements {
  plan: PlanId;
  /** Origen del derecho: en Fase 1 siempre 'local-default'. */
  source: 'local-default' | 'server';
  /** Preparado para licencias de centros de formación (sin panel todavía). */
  organizationId?: string;
}

export const DEFAULT_ENTITLEMENTS: Entitlements = { plan: 'free', source: 'local-default' };

export function hasFeature(e: Entitlements, feature: FeatureKey): boolean {
  return PLAN_FEATURES[e.plan].includes(feature);
}

export function formatPrice(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amountCents / 100);
}
