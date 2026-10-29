import { useState } from 'react';
import { hasFeature, PLAN_LIMITS } from '@/billing/plans';
import { SCENARIOS } from '@/scenarios/library';
import { useSimStore } from '@/simulator/store';
import { formatDateTime } from '@/time-engine/zoned';
import { Panel } from '../components/Panel';
import { useEntitlements, useUiStore } from '../uiStore';

/** Biblioteca de escenarios didácticos y escenarios guardados por el usuario. */
export function ScenariosScreen() {
  const store = useSimStore();
  const sim = store.sim;
  const ent = useEntitlements();
  const go = useUiStore((s) => s.go);
  const limit = PLAN_LIMITS[ent.plan].savedScenarios;
  const [slots, setSlots] = useState(() => store.slots());
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const refresh = () => setSlots(store.slots());

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Panel title="Biblioteca de escenarios">
        <p className="mb-3 text-sm text-slate-400">
          Escenario activo: <strong className="text-slate-200" data-testid="active-scenario">{sim.scenario.title}</strong>. Cargar otro sustituye al activo (guárdalo antes si quieres conservarlo).
        </p>
        <ul className="space-y-3">
          {SCENARIOS.map((def) => {
            const allowed = hasFeature(ent, def.feature);
            return (
              <li key={def.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white">{def.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-400">{def.summary}</p>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${allowed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-violet-500/15 text-violet-300'}`}>
                    {hasFeature({ plan: 'free', source: 'local-default' }, def.feature) ? 'Gratis' : 'Premium'}
                  </span>
                </div>
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-slate-400">
                  {def.objectives.map((o) => <li key={o}>{o}</li>)}
                </ul>
                <button
                  type="button"
                  disabled={!allowed}
                  data-testid={`load-${def.id}`}
                  onClick={() => {
                    if (!window.confirm(`¿Cargar «${def.title}»? Se sustituirá el escenario activo.`)) return;
                    store.loadScenario(def);
                    go('calendar');
                  }}
                  className="mt-3 rounded-lg border border-cyan-600 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-transparent disabled:text-slate-500"
                >
                  {allowed ? 'Cargar escenario' : 'Disponible en Premium'}
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title={`Mis escenarios guardados (${slots.length}/${limit})`}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const r = store.saveSlot(name || sim.scenario.title, limit);
            setMsg(r.ok ? 'Escenario guardado' : r.reason);
            if (r.ok) setName('');
            refresh();
          }}
        >
          <label htmlFor="slot-name" className="sr-only">Nombre del guardado</label>
          <input id="slot-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nombre (opcional)" className="min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b1220] px-2 py-1.5 text-sm" />
          <button type="submit" data-testid="save-slot" className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm hover:border-cyan-700">Guardar</button>
        </form>
        <p className="mt-1 h-4 text-xs text-cyan-300" role="status">{msg}</p>
        <ul className="mt-2 space-y-2" data-testid="slots">
          {slots.map((s) => (
            <li key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              <div className="font-medium text-slate-100">{s.name}</div>
              <div className="text-xs text-slate-500">{s.scenarioTitle} · reloj en {formatDateTime(s.simNow, 'UTC')} UTC</div>
              <div className="mt-2 flex gap-2">
                <button type="button" className="rounded border border-white/15 px-2 py-1 text-xs hover:border-cyan-700" onClick={() => { if (window.confirm('¿Cargar este guardado? Se sustituirá el escenario activo.')) { store.loadSlot(s.id); go('calendar'); } }}>Cargar</button>
                <button type="button" className="rounded border border-rose-700/60 px-2 py-1 text-xs text-rose-200 hover:bg-rose-600/10" onClick={() => { store.deleteSlot(s.id); refresh(); }}>Borrar</button>
              </div>
            </li>
          ))}
          {slots.length === 0 && <li className="text-sm text-slate-500">Aún no has guardado ningún escenario.</li>}
        </ul>
        <p className="mt-3 text-[11px] text-slate-500">
          Plan {ent.plan === 'premium' ? 'Premium' : 'gratuito'}: hasta {limit} guardado(s), solo en este navegador. TachoLab es una herramienta didáctica, no un archivo de jornadas reales.
        </p>
      </Panel>
    </div>
  );
}
