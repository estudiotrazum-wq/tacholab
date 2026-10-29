import { useSimStore } from '@/simulator/store';
import type { SimConfig } from '@/simulator/state';
import { useUiStore } from '../uiStore';
import { Panel } from '../components/Panel';

export function SettingsScreen() {
  const ui = useUiStore();
  const config = useSimStore((s) => s.sim.config);
  const dispatch = useSimStore((s) => s.dispatch);
  const wipe = useSimStore((s) => s.wipeAllData);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Panel title="Aprendizaje">
        <fieldset className="space-y-2 text-sm">
          <legend className="sr-only">Modo de aprendizaje</legend>
          {(['assisted', 'free'] as const).map((m) => (
            <label key={m} className="flex items-start gap-2">
              <input type="radio" name="mode" checked={ui.learningMode === m} onChange={() => ui.update({ learningMode: m })} className="mt-1 accent-cyan-400" />
              <span>
                <span className="text-slate-100">{m === 'assisted' ? 'Modo asistido' : 'Modo libre'}</span>
                <span className="block text-xs text-slate-400">
                  {m === 'assisted' ? 'Guía paso a paso y resaltado del siguiente control.' : 'Sin indicaciones permanentes: puedes cometer errores y ver sus consecuencias.'}
                </span>
              </span>
            </label>
          ))}
          <label className="flex items-center gap-2 pt-2">
            <input type="checkbox" checked={ui.warningsEnabled} onChange={(e) => ui.update({ warningsEnabled: e.target.checked })} className="accent-cyan-400" />
            <span className="text-slate-100">Mostrar explicación normativa de los avisos</span>
          </label>
        </fieldset>
      </Panel>

      <Panel title="Comportamiento del equipo (aproximación pedagógica)">
        <label className="block text-sm text-slate-300" htmlFor="after-stop">Actividad seleccionada al detener el vehículo</label>
        <select
          id="after-stop"
          value={config.afterStopActivity}
          onChange={(e) => dispatch({ type: 'SET_CONFIG', patch: { afterStopActivity: e.target.value as SimConfig['afterStopActivity'] } })}
          className="mt-1 rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm"
        >
          <option value="WORK">Otros trabajos</option>
          <option value="AVAILABILITY">Disponibilidad</option>
          <option value="REST">Pausa / descanso</option>
          <option value="KEEP">Mantener la actividad previa</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">El comportamiento real depende del modelo, la generación y la configuración del equipo instalado.</p>
      </Panel>

      <Panel title="Datos y privacidad">
        <p className="text-sm text-slate-300">
          Todo se guarda solo en este navegador. No se solicitan datos reales de tarjetas, tacógrafos, matrículas ni documentación profesional; las tarjetas son ficticias.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('¿Borrar todos los datos guardados de TachoLab en este navegador?')) {
              wipe();
              ui.update({ disclaimerAccepted: false });
            }
          }}
          className="mt-3 rounded-lg border border-rose-600/60 bg-rose-600/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-600/20"
        >
          Borrar todos mis datos
        </button>
      </Panel>
    </div>
  );
}
