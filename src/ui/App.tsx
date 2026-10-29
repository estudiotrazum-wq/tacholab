import { useUiStore, type View } from './uiStore';
import { useSimLoop } from './hooks/useSimLoop';
import { HomeScreen } from './screens/HomeScreen';
import { CabinScreen } from './screens/CabinScreen';
import { DeviceScreen } from './screens/DeviceScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { ScenariosScreen } from './screens/ScenariosScreen';
import { ReportScreen } from './screens/ReportScreen';
import { AcademyScreen } from './screens/AcademyScreen';
import { PremiumScreen } from './screens/PremiumScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const NAV: { id: View; label: string }[] = [
  { id: 'home', label: 'Inicio' },
  { id: 'cabin', label: 'Cabina' },
  { id: 'device', label: 'Tacógrafo' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'report', label: 'Informe' },
  { id: 'scenarios', label: 'Escenarios' },
  { id: 'academy', label: 'Academia' },
  { id: 'premium', label: 'Premium' },
  { id: 'settings', label: 'Ajustes' },
];

export function App() {
  useSimLoop();
  const { view, go, disclaimerAccepted, update } = useUiStore();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 print:hidden border-b border-ink-700 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
          <button type="button" onClick={() => go('home')} className="flex items-center gap-2 font-semibold text-white">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-cyan-500/15 font-mono text-xs text-cyan-300">TL</span>
            <span className="hidden sm:inline">TachoLab <span className="text-cyan-400">EU</span></span>
          </button>
          <nav aria-label="Secciones" className="-mx-1 flex flex-1 gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => go(n.id)}
                aria-current={view === n.id ? 'page' : undefined}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm ${view === n.id ? 'bg-ink-700 text-white' : 'text-slate-400 hover:text-slate-100'}`}
              >
                {n.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {view === 'home' && <HomeScreen />}
        {view === 'cabin' && <CabinScreen />}
        {view === 'device' && <DeviceScreen />}
        {view === 'calendar' && <CalendarScreen />}
        {view === 'report' && <ReportScreen />}
        {view === 'scenarios' && <ScenariosScreen />}
        {view === 'academy' && <AcademyScreen />}
        {view === 'premium' && <PremiumScreen />}
        {view === 'settings' && <SettingsScreen />}
      </main>

      <footer className="print:hidden border-t border-ink-800 px-4 py-3 text-center text-[11px] text-slate-500">
        TachoLab EU v0.4 · Simulador educativo independiente, no homologado. No sustituye la formación oficial ni los equipos reales.
      </footer>

      {!disclaimerAccepted && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="disc-title">
          <div className="max-w-lg rounded-2xl border border-ink-600 bg-ink-900 p-6">
            <h2 id="disc-title" className="text-lg font-semibold text-white">Antes de empezar</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
              <li>Es un <strong>simulador educativo independiente</strong>. No está homologado ni reproduce ningún tacógrafo comercial.</li>
              <li>No sustituye las instrucciones oficiales, la formación profesional ni los dispositivos instalados en los vehículos.</li>
              <li>Los cálculos normativos son <strong>preliminares</strong> y no constituyen asesoramiento jurídico.</li>
              <li>Usa solo tarjetas y perfiles ficticios. Los datos se guardan únicamente en tu navegador.</li>
            </ul>
            <button type="button" autoFocus onClick={() => update({ disclaimerAccepted: true })} className="mt-5 w-full rounded-lg bg-cyan-500 py-2.5 font-semibold text-ink-950 hover:bg-cyan-400">
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
