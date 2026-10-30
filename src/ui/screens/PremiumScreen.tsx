import { N_, t } from '@/i18n';
import { DEFAULT_ENTITLEMENTS, formatPrice, PLAN_FEATURES, PRICING } from '@/billing/plans';
import { Panel } from '../components/Panel';

const LABELS: Record<string, string> = {
  cabin: N_('Cabina interactiva'), tachograph: N_('Tacógrafo funcional'), 'time-acceleration': N_('Reloj acelerado'),
  'active-scenario': N_('Una simulación activa de dos semanas'), 'basic-summary': N_('Resumen de conducción'),
  'essential-warnings': N_('Advertencias esenciales'), 'academy-basic': N_('Cinco ejercicios iniciales'),
  'academy-advanced': N_('Academia avanzada'), 'complex-scenarios': N_('Escenarios normativos complejos'),
  'detailed-evaluation': N_('Evaluación detallada de errores'), 'extended-reports': N_('Informes educativos ampliados'),
  'scenario-library': N_('Biblioteca de escenarios'), 'multi-save': N_('Guardado de varios ejercicios'),
  'visual-customization': N_('Personalización visual'), 'completion-certificate': N_('Certificado privado de finalización (no oficial)'),
};

export function PremiumScreen() {
  const p = PRICING.premium;
  const premiumOnly = PLAN_FEATURES.premium.filter((f) => !PLAN_FEATURES.free.includes(f));
  return (
    <div className="mx-auto grid max-w-4xl gap-4 px-4 py-6 md:grid-cols-2">
      <Panel title={t('Gratis')} aside={DEFAULT_ENTITLEMENTS.plan === 'free' ? <span className="text-xs text-emerald-300">{t('Tu plan')}</span> : null}>
        <ul className="space-y-1 text-sm text-slate-300">{PLAN_FEATURES.free.map((f) => <li key={f}>✓ {t(LABELS[f]!)}</li>)}</ul>
      </Panel>
      <Panel title={t('Premium')} aside={<span className="text-sm text-slate-200">{formatPrice(p.amountCents, p.currency)} · {t('pago único')}</span>}>
        <ul className="space-y-1 text-sm text-slate-300">{premiumOnly.map((f) => <li key={f}>＋ {t(LABELS[f]!)}</li>)}</ul>
        <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-lg border border-white/15 py-2 text-sm text-slate-500">
          {t('Pagos no disponibles todavía')}
        </button>
        <p className="mt-2 text-xs text-slate-500">
          {t('Los pagos se activarán tras completar pruebas, revisión legal, política de privacidad, condiciones de venta y configuración fiscal. Precio orientativo sujeto a cambios.')}
        </p>
      </Panel>
    </div>
  );
}
