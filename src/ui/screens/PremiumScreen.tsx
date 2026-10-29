import { DEFAULT_ENTITLEMENTS, formatPrice, PLAN_FEATURES, PRICING } from '@/billing/plans';
import { Panel } from '../components/Panel';

const LABELS: Record<string, string> = {
  cabin: 'Cabina interactiva', tachograph: 'Tacógrafo funcional', 'time-acceleration': 'Reloj acelerado',
  'active-scenario': 'Una simulación activa de dos semanas', 'basic-summary': 'Resumen de conducción',
  'essential-warnings': 'Advertencias esenciales', 'academy-basic': 'Cinco ejercicios iniciales',
  'academy-advanced': 'Academia avanzada', 'complex-scenarios': 'Escenarios normativos complejos',
  'detailed-evaluation': 'Evaluación detallada de errores', 'extended-reports': 'Informes educativos ampliados',
  'scenario-library': 'Biblioteca de escenarios', 'multi-save': 'Guardado de varios ejercicios',
  'visual-customization': 'Personalización visual', 'completion-certificate': 'Certificado privado de finalización (no oficial)',
};

export function PremiumScreen() {
  const p = PRICING.premium;
  const premiumOnly = PLAN_FEATURES.premium.filter((f) => !PLAN_FEATURES.free.includes(f));
  return (
    <div className="mx-auto grid max-w-4xl gap-4 px-4 py-6 md:grid-cols-2">
      <Panel title="Gratis" aside={DEFAULT_ENTITLEMENTS.plan === 'free' ? <span className="text-xs text-emerald-300">Tu plan</span> : null}>
        <ul className="space-y-1 text-sm text-slate-300">{PLAN_FEATURES.free.map((f) => <li key={f}>✓ {LABELS[f]}</li>)}</ul>
      </Panel>
      <Panel title="Premium" aside={<span className="text-sm text-slate-200">{formatPrice(p.amountCents, p.currency)} · pago único</span>}>
        <ul className="space-y-1 text-sm text-slate-300">{premiumOnly.map((f) => <li key={f}>＋ {LABELS[f]}</li>)}</ul>
        <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-lg border border-white/15 py-2 text-sm text-slate-500">
          Pagos no disponibles todavía
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Los pagos se activarán tras completar pruebas, revisión legal, política de privacidad, condiciones de venta y configuración fiscal. Precio orientativo sujeto a cambios.
        </p>
      </Panel>
    </div>
  );
}
