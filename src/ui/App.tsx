import { useEffect } from 'react';
import { useUiStore } from './uiStore';
import { SECTIONS, sectionOf } from './shell/nav';
import { NavIcon } from './shell/NavIcon';
import { SubTabs } from './shell/SubTabs';
import { useSimStore } from '@/simulator/store';
import { useAcademyStore } from '@/academy/store';
import { ExerciseResultDialog } from './components/ExerciseResultDialog';
import { useSimLoop } from './hooks/useSimLoop';
import { CabinScreen } from './screens/CabinScreen';
import { DeviceScreen } from './screens/DeviceScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { ScenariosScreen } from './screens/ScenariosScreen';
import { ReportScreen } from './screens/ReportScreen';
import { AcademyScreen } from './screens/AcademyScreen';
import { PremiumScreen } from './screens/PremiumScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ConfirmDialog } from './confirm';
import { GuideScreen } from './screens/GuideScreen';
import { TutorialCoach } from './components/TutorialCoach';
import { useTutorialStore } from '@/tutorial/store';
import { startTutorial } from './tutorial';
import { syncDriverName } from './driverName';
import { useSound } from './audio/useSound';
import { SoundButton } from './components/SoundControls';
import { DriverNameField } from './components/DriverNameField';


export function App() {
  useSimLoop();
  // La academia observa cada cambio de la simulación para avanzar los pasos del ejercicio.
  useEffect(() => {
    useAcademyStore.getState().observe(useSimStore.getState().sim);
    return useSimStore.subscribe((s, prev) => {
      if (s.sim !== prev.sim) {
        useAcademyStore.getState().observe(s.sim);
        useTutorialStore.getState().observe(s.sim);
      }
    });
  }, []);
  useEffect(() => syncDriverName(), []);
  useSound();
  const { view, go, disclaimerAccepted, update, lastViews, learningMode } = useUiStore();
  const section = sectionOf(view);

  return (
    <div className="flex min-h-full">
      <div className="app-bg" aria-hidden="true" />

      {/* Menú lateral (escritorio) */}
      <aside className="sticky top-0 z-30 hidden h-screen w-24 shrink-0 flex-col items-center gap-2 border-r border-white/5 bg-[#050913]/70 py-4 backdrop-blur-xl md:flex print:hidden" aria-label="Menú">
        <span className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 font-mono text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.35)]" title="TachoLab EU">TL</span>
        <nav aria-label="Secciones" className="flex flex-col gap-1">
          {SECTIONS.map((sec) => (
            <RailButton key={sec.id} label={sec.label} icon={sec.icon} active={section?.id === sec.id} onClick={() => go(lastViews[sec.id] ?? sec.views[0]!.id)} />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <RailButton label="Guía" icon="book" active={view === 'guide'} onClick={() => go('guide')} />
          <SoundButton />
          <RailButton label={learningMode === 'assisted' ? 'Ayudas: sí' : 'Ayudas: no'} icon="bulb" active={learningMode === 'assisted'} onClick={() => update({ learningMode: learningMode === 'assisted' ? 'free' : 'assisted' })} pressed={learningMode === 'assisted'} />
          <RailButton label="Premium" icon="star" active={view === 'premium'} onClick={() => go('premium')} />
          <RailButton label="Ajustes" icon="settings" active={view === 'settings'} onClick={() => go('settings')} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (móvil) */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-white/5 bg-[#050913]/80 px-4 backdrop-blur-xl md:hidden print:hidden">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 font-mono text-xs font-bold text-slate-950">TL</span>
          <span className="whitespace-nowrap font-semibold text-white">TachoLab <span className="text-gradient">EU</span></span>
          <button
            type="button"
            onClick={() => update({ learningMode: learningMode === 'assisted' ? 'free' : 'assisted' })}
            aria-pressed={learningMode === 'assisted'}
            aria-label={learningMode === 'assisted' ? 'Ayudas activadas' : 'Ayudas desactivadas'}
            title="Ayudas contextuales"
            className={`ml-auto grid h-9 w-9 place-items-center rounded-full ${learningMode === 'assisted' ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-400'}`}
          >
            <NavIcon name="bulb" />
          </button>
          <SoundButton variant="header" />
          <button type="button" onClick={() => go('guide')} aria-label="Guía y tutorial" className={`grid h-9 w-9 place-items-center rounded-full ${view === 'guide' ? 'bg-white/10 text-white' : 'text-slate-300'}`}>
            <NavIcon name="book" />
          </button>
          <button type="button" onClick={() => go('settings')} aria-label="Ajustes" className="grid h-9 w-9 place-items-center rounded-full text-slate-300">
            <NavIcon name="settings" />
          </button>
        </header>

        <SubTabs />

        <main className="flex-1 pb-24 md:pb-6">
          {view === 'cabin' && <CabinScreen />}
          {view === 'device' && <DeviceScreen />}
          {view === 'calendar' && <CalendarScreen />}
          {view === 'report' && <ReportScreen />}
          {view === 'scenarios' && <ScenariosScreen />}
          {view === 'academy' && <AcademyScreen />}
          {view === 'premium' && <PremiumScreen />}
          {view === 'settings' && <SettingsScreen />}
          {view === 'guide' && <GuideScreen />}
        </main>

        <footer className="px-4 pb-24 pt-2 text-center text-[11px] text-slate-500 md:pb-4 print:hidden">
          TachoLab EU v0.17 · Simulador educativo independiente, no homologado. No sustituye la formación oficial ni los equipos reales.
        </footer>
      </div>

      {/* Navegación inferior en móvil */}
      <nav aria-label="Secciones (móvil)" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050913]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden print:hidden">
        <div className="grid grid-cols-3">
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
      <TutorialCoach />
      <ConfirmDialog />

      {!disclaimerAccepted && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="disc-title">
          <div className="glass-strong max-w-xl rounded-3xl p-7">
            <h2 id="disc-title" className="text-xl font-semibold text-white">Bienvenido a TachoLab EU</h2>
            <p className="mt-1 text-sm text-slate-400">Un simulador para aprender a usar el tacógrafo digital en tres pasos:</p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['1', 'Mete la tarjeta', 'Arrástrala desde la izquierda hasta la ranura del tacógrafo.'],
                ['2', 'Arranca el camión', 'Gira la llave a II y sube el acelerador: el tacógrafo registra la conducción solo.'],
                ['3', 'Deja correr el tiempo', 'Con ▶ y la velocidad del reloj (hasta ×3600, una hora por segundo) verás pasar las horas.'],
              ].map(([n, t, d]) => (
                <li key={n} className="rounded-2xl bg-white/5 p-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400 text-sm font-bold text-slate-950">{n}</span>
                  <div className="mt-2 text-sm font-semibold text-white">{t}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{d}</div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs leading-relaxed text-slate-400">
              Es un <strong className="text-slate-200">simulador educativo independiente</strong>: no está homologado, no reproduce ningún tacógrafo comercial y no sustituye la formación oficial ni los equipos reales. Los cálculos normativos son orientativos. Solo se usan tarjetas ficticias y los datos se guardan en tu navegador.
            </p>
            <div className="mt-5 rounded-2xl bg-white/5 p-4">
              <p className="mb-2 text-sm font-medium text-white">¿Cómo te llamas? <span className="font-normal text-slate-400">(opcional)</span></p>
              <DriverNameField compact />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                autoFocus
                data-testid="welcome-tutorial"
                onClick={() => {
                  update({ disclaimerAccepted: true });
                  startTutorial();
                }}
                className="rounded-2xl bg-white py-3 font-semibold text-slate-900 transition hover:scale-[1.01]"
              >
                ▶ Empezar el tutorial (5 min)
              </button>
              <button type="button" onClick={() => update({ disclaimerAccepted: true })} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/15">
                Explorar por mi cuenta
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-500">Puedes abrir el tutorial y la guía rápida cuando quieras desde «Guía».</p>
          </div>
        </div>
      )}
    </div>
  );
}

function RailButton({ label, icon, active, onClick, pressed }: { label: string; icon: Parameters<typeof NavIcon>[0]['name']; active: boolean; onClick: () => void; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={pressed === undefined && active ? 'page' : undefined}
      aria-pressed={pressed}
      className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-medium transition ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      <NavIcon name={icon} className="h-5 w-5" />
      {label}
    </button>
  );
}
