import { useEffect } from 'react';
import { useUiStore } from './uiStore';
import { SECTIONS, sectionOf } from './shell/nav';
import { NavIcon } from './shell/NavIcon';
import { SubTabs } from './shell/SubTabs';
import { useSimStore } from '@/simulator/store';
import { useAcademyStore } from '@/academy/store';
import { ExerciseResultDialog } from './components/ExerciseResultDialog';
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
import { ConfirmDialog } from './confirm';


export function App() {
  useSimLoop();
  // La academia observa cada cambio de la simulación para avanzar los pasos del ejercicio.
  useEffect(() => {
    useAcademyStore.getState().observe(useSimStore.getState().sim);
    return useSimStore.subscribe((s, prev) => {
      if (s.sim !== prev.sim) useAcademyStore.getState().observe(s.sim);
    });
  }, []);
  const { view, go, disclaimerAccepted, update, lastViews } = useUiStore();
  const section = sectionOf(view);

  return (
    <div className="flex min-h-full flex-col">
      <div className="app-bg" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#050913]/70 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <button type="button" onClick={() => go('home')} className="flex items-center gap-2 font-semibold text-white" aria-label="TachoLab EU, inicio">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 font-mono text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)]">TL</span>
            <span className="hidden sm:inline">TachoLab <span className="text-gradient">EU</span></span>
          </button>
          <nav aria-label="Secciones" className="mx-auto hidden md:block">
            <div className="glass flex gap-1 rounded-full p-1">
              {SECTIONS.map((sec) => {
                const active = section?.id === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => go(lastViews[sec.id] ?? sec.views[0]!.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <NavIcon name={sec.icon} className="h-4 w-4" />
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button type="button" onClick={() => go('premium')} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${view === 'premium' ? 'border-violet-400 bg-violet-500/20 text-violet-100' : 'border-violet-500/40 text-violet-200 hover:bg-violet-500/10'}`}>
              <NavIcon name="star" className="h-3.5 w-3.5" /> Premium
            </button>
            <button type="button" onClick={() => go('settings')} aria-label="Ajustes" title="Ajustes" className={`grid h-9 w-9 place-items-center rounded-full transition ${view === 'settings' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <NavIcon name="settings" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <SubTabs />

      <main className="flex-1 pb-36 md:pb-28">
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

      <footer className={`px-4 pb-24 pt-2 text-center text-[11px] text-slate-500 md:pb-6 print:hidden ${section?.id === 'drive' ? 'hidden' : ''}`}>
        TachoLab EU v0.7 · Simulador educativo independiente, no homologado. No sustituye la formación oficial ni los equipos reales.
      </footer>

      {/* Navegación inferior en móvil */}
      <nav aria-label="Secciones (móvil)" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050913]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden print:hidden">
        <div className="grid grid-cols-4">
          {SECTIONS.map((sec) => {
            const active = section?.id === sec.id;
            return (
              <button key={sec.id} type="button" onClick={() => go(lastViews[sec.id] ?? sec.views[0]!.id)} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? 'text-cyan-300' : 'text-slate-400'}`}>
                <NavIcon name={sec.icon} />
                {sec.label}
              </button>
            );
          })}
        </div>
      </nav>

      <ExerciseResultDialog />
      <ConfirmDialog />

      {!disclaimerAccepted && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="disc-title">
          <div className="glass-strong max-w-lg rounded-3xl p-7">
            <h2 id="disc-title" className="text-lg font-semibold text-white">Antes de empezar</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
              <li>Es un <strong>simulador educativo independiente</strong>. No está homologado ni reproduce ningún tacógrafo comercial.</li>
              <li>No sustituye las instrucciones oficiales, la formación profesional ni los dispositivos instalados en los vehículos.</li>
              <li>Los cálculos normativos son <strong>preliminares</strong> y no constituyen asesoramiento jurídico.</li>
              <li>Usa solo tarjetas y perfiles ficticios. Los datos se guardan únicamente en tu navegador.</li>
            </ul>
            <button type="button" autoFocus onClick={() => update({ disclaimerAccepted: true })} className="mt-6 w-full rounded-2xl bg-white py-3 font-semibold text-slate-900 transition hover:scale-[1.01]">
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
