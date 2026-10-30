import { t } from '@/i18n';
import { useSimStore } from '@/simulator/store';
import { useAcademyStore } from '@/academy/store';
import type { SimConfig } from '@/simulator/state';
import { useUiStore } from '../uiStore';
import { Panel } from '../components/Panel';
import { useCabinStore, type Quality } from '../cabin/cabinStore';
import { confirmThen } from '../confirm';
import { DriverNameField } from '../components/DriverNameField';
import { LangSwitch } from '../components/LangSwitch';
import { clearDriverName } from '../driverName';

export function SettingsScreen() {
  const ui = useUiStore();
  const config = useSimStore((s) => s.sim.config);
  const dispatch = useSimStore((s) => s.dispatch);
  const wipe = useSimStore((s) => s.wipeAllData);
  const cab = useCabinStore();

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Panel title={t('Idioma')}>
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <LangSwitch />
          <span className="text-xs text-slate-400">{t('Español o inglés. Se recuerda en este navegador.')}</span>
        </div>
      </Panel>

      <Panel title={t('Tu tarjeta')}>
        <p className="mb-3 text-sm text-slate-300">{t('Pon tu nombre en la tarjeta de conductor ficticia: aparecerá en la bandeja, en la bienvenida del tacógrafo y en los tickets.')}</p>
        <DriverNameField />
        {ui.driverName && (
          <button type="button" onClick={clearDriverName} className="mt-2 text-xs text-slate-400 underline hover:text-white" data-testid="driver-name-clear">
            {t('Borrar mi nombre y usar el de ejemplo')}
          </button>
        )}
      </Panel>

      <Panel title={t('Aprendizaje')}>
        <fieldset className="space-y-2 text-sm">
          <legend className="sr-only">{t('Modo de aprendizaje')}</legend>
          {(['assisted', 'free'] as const).map((m) => (
            <label key={m} className="flex items-start gap-2">
              <input type="radio" name="mode" checked={ui.learningMode === m} onChange={() => ui.update({ learningMode: m })} className="mt-1 accent-cyan-400" />
              <span>
                <span className="text-slate-100">{m === 'assisted' ? t('Modo asistido') : t('Modo libre')}</span>
                <span className="block text-xs text-slate-400">
                  {m === 'assisted' ? t('Guía paso a paso y resaltado del siguiente control.') : t('Sin indicaciones permanentes: puedes cometer errores y ver sus consecuencias.')}
                </span>
              </span>
            </label>
          ))}
          <label className="flex items-center gap-2 pt-2">
            <input type="checkbox" checked={ui.warningsEnabled} onChange={(e) => ui.update({ warningsEnabled: e.target.checked })} className="accent-cyan-400" />
            <span className="text-slate-100">{t('Mostrar explicación normativa de los avisos')}</span>
          </label>
        </fieldset>
      </Panel>

      <Panel title={t('Apariencia')}>
        <fieldset className="grid gap-2 text-sm sm:grid-cols-2">
          <legend className="mb-2 text-slate-300">{t('Fondo')}</legend>
          {([
            ['atlas', t('Atlas de carreteras'), t('Mapa nocturno con la ruta del camión, que avanza según los kilómetros.')],
            ['plain', t('Liso'), t('Degradado oscuro sin mapa (más sobrio).')],
          ] as const).map(([v, t, d]) => (
            <label key={v} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${ui.background === v ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10'}`}>
              <input type="radio" name="background" checked={ui.background === v} onChange={() => ui.update({ background: v })} className="mt-1 accent-cyan-400" data-testid={`bg-${v}`} />
              <span>
                <span className="text-slate-100">{t}</span>
                <span className="block text-xs text-slate-400">{d}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <legend className="mb-2 text-slate-300">{t('Pantalla del tacógrafo')}</legend>
          {([
            ['classic', t('Clásica'), t('LCD verde, el más extendido'), 'linear-gradient(180deg,#c9d67a,#b4c262)', '#1d2610'],
            ['night', t('Nocturna'), t('Texto claro sobre fondo oscuro'), 'linear-gradient(180deg,#0c1a2b,#08121f)', '#e6f4ff'],
            ['amber', t('Ámbar'), t('Retroiluminación ámbar'), 'linear-gradient(180deg,#1a1206,#120c03)', '#ffb547'],
          ] as const).map(([v, label, d, bg, ink]) => (
            <label key={v} className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3 ${ui.lcdTheme === v ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10'}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="lcd" checked={ui.lcdTheme === v} onChange={() => ui.update({ lcdTheme: v })} className="accent-cyan-400" data-testid={`lcd-${v}`} />
                <span className="text-slate-100">{label}</span>
              </span>
              <span className="rounded-md px-2 py-1 font-mono text-sm" style={{ background: bg, color: ink, fontFamily: '"VT323", ui-monospace, monospace' }}>12:40 ⊙ 80km/h</span>
              <span className="text-xs text-slate-400">{d}</span>
            </label>
          ))}
        </fieldset>
      </Panel>

      <Panel title={t('Cabina')}>
        <label className="block text-sm text-slate-300" htmlFor="quality">{t('Calidad visual')}</label>
        <select id="quality" value={cab.quality} onChange={(e) => cab.set({ quality: e.target.value as Quality })} className="mt-1 rounded-md border border-white/15 bg-[#0b1220] px-2 py-1 text-sm">
          <option value="high">{t('Alta (luces difuminadas, animaciones y mirada con el ratón)')}</option>
          <option value="low">{t('Básica (para ordenadores modestos)')}</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">{t('Con «Básica» se desactivan los desenfoques y las animaciones decorativas. Si tu sistema pide reducir el movimiento, se respeta siempre.')}</p>
      </Panel>

      <Panel title={t('Comportamiento del equipo (aproximación pedagógica)')}>
        <label className="block text-sm text-slate-300" htmlFor="after-stop">{t('Actividad seleccionada al detener el vehículo')}</label>
        <select
          id="after-stop"
          value={config.afterStopActivity}
          onChange={(e) => dispatch({ type: 'SET_CONFIG', patch: { afterStopActivity: e.target.value as SimConfig['afterStopActivity'] } })}
          className="mt-1 rounded-md border border-white/15 bg-[#0b1220] px-2 py-1 text-sm"
        >
          <option value="WORK">{t('Otros trabajos')}</option>
          <option value="AVAILABILITY">{t('Disponibilidad')}</option>
          <option value="REST">{t('Pausa / descanso')}</option>
          <option value="KEEP">{t('Mantener la actividad previa')}</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">{t('El comportamiento real depende del modelo, la generación y la configuración del equipo instalado.')}</p>
      </Panel>

      {import.meta.env.DEV && (
        <Panel title={t('Desarrollo')}>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ui.devPremiumPreview} onChange={(e) => ui.update({ devPremiumPreview: e.target.checked })} className="accent-cyan-400" />
            <span className="text-slate-100">{t('Vista previa de contenido premium (solo en el servidor de desarrollo)')}</span>
          </label>
          <p className="mt-1 text-xs text-slate-500">{t('No existe en la versión publicada. El acceso real se validará en servidor en la Fase 6.')}</p>
        </Panel>
      )}

      <Panel title={t('Datos y privacidad')}>
        <p className="text-sm text-slate-300">
          {t('Todo se guarda solo en este navegador. No se solicitan datos reales de tarjetas, tacógrafos, matrículas ni documentación profesional; las tarjetas son ficticias. El único dato personal es el nombre que tú quieras poner en tu tarjeta.')}
        </p>
        <button
          type="button"
          onClick={() => {
            confirmThen(t('¿Borrar todos los datos guardados de TachoLab en este navegador?'), () => {
              wipe();
              useAcademyStore.setState({ progress: {}, session: null });
              ui.update({ disclaimerAccepted: false, driverName: '', tutorialDone: false });
            }, { confirmLabel: t('Borrar'), danger: true });
          }}
          className="mt-3 rounded-lg border border-rose-600/60 bg-rose-600/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-600/20"
        >
          {t('Borrar todos mis datos')}
        </button>
      </Panel>
    </div>
  );
}
