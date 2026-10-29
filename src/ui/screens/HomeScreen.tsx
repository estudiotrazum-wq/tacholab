import { useMemo } from 'react';
import { ACTIVITY_LABEL, ACTIVITIES } from '@/shared/types';
import { useSimStore } from '@/simulator/store';
import { useAcademyStore } from '@/academy/store';
import { exerciseDef } from '@/academy/catalog';
import { renderDisplay } from '@/tachograph/display';
import { formatDateTime, formatWeekday } from '@/time-engine/zoned';
import { useUiStore } from '../uiStore';
import { ActivityIcon, ACTIVITY_COLOR } from '../components/icons';

const HINTS: Record<(typeof ACTIVITIES)[number], string> = {
  DRIVING: 'Se registra sola al moverse el camión',
  WORK: 'Carga, descarga y comprobaciones',
  AVAILABILITY: 'Esperas conocidas de antemano',
  REST: 'Pausas y descansos',
};

export function HomeScreen() {
  const go = useUiStore((s) => s.go);
  const sim = useSimStore((s) => s.sim);
  const { session, progress } = useAcademyStore();
  const display = useMemo(() => renderDisplay(sim), [sim]);
  const started = sim.clock.now > sim.scenario.startsAt || sim.timeline.events.length > 0;
  const exercise = session && !session.result ? exerciseDef(session.exerciseId) : undefined;
  const basicDone = ['buttons', 'insert-card', 'activities', 'simple-day', 'break-45'].filter((id) => progress[id]?.passed).length;
  const tz = sim.scenario.timeZone;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:pt-14">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Simulador educativo · Normativa UE
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Aprende el tacógrafo <span className="text-gradient">conduciendo</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Sube a la cabina, inserta tu tarjeta ficticia y descubre en tiempo acelerado cómo se cuentan las pausas, las jornadas y los descansos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => go('cabin')} className="rounded-2xl bg-white px-6 py-3.5 font-semibold text-slate-900 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.5)] transition hover:scale-[1.02]">
              Empezar a conducir
            </button>
            <button type="button" onClick={() => go('academy')} className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
              Ir a la Academia
            </button>
          </div>
          {(exercise || started) && (
            <button type="button" onClick={() => go('device')} className="glass mt-6 flex w-full max-w-md items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-white/10" data-testid="continue">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/20 text-violet-200">↻</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">Continuar donde lo dejaste</span>
                <span className="block truncate text-xs text-slate-400">
                  {exercise ? `Ejercicio ${exercise.number}: ${exercise.title}` : sim.scenario.title} · {formatWeekday(sim.clock.now, tz)} {formatDateTime(sim.clock.now, tz)} UTC
                </span>
              </span>
            </button>
          )}
        </div>

        {/* Vista previa en vivo del tacógrafo ficticio */}
        <div className="relative">
          <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-tr from-cyan-500/25 via-sky-500/10 to-violet-500/25 blur-3xl" aria-hidden="true" />
          <button type="button" onClick={() => go('device')} className="glass relative block w-full rounded-3xl p-5 text-left transition hover:scale-[1.01]" aria-label="Abrir el tacógrafo">
            <div className="flex items-center justify-between text-[10px] tracking-[0.25em] text-slate-400">
              <span>TACHOLAB · TL-1 EDU</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />EN VIVO</span>
            </div>
            <div className="lcd-scan mt-3 rounded-2xl border border-cyan-900/60 bg-lcd-bg p-4 font-mono">
              <div className="lcd-glow border-b border-cyan-900 pb-1 text-xs text-cyan-300/80">{display.title}</div>
              {display.lines.map((l, i) => (
                <div key={i} className="lcd-glow whitespace-pre text-lg leading-8 text-lcd-fg">{l || ' '}</div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2" aria-hidden="true">
              {['▲', '▼', '✕', '✓'].map((k) => (
                <span key={k} className="grid h-10 place-items-center rounded-xl bg-white/5 text-slate-300">{k}</span>
              ))}
            </div>
          </button>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        <Feature title="Cabina y tacógrafo" text="Una cabina de camión con luces LED y un tacógrafo original que se maneja con sus botones." onClick={() => go('cabin')} cta="Subir a la cabina" />
        <Feature title="Normativa europea" text="4 h 30 de conducción, 9/10 h por jornada, 56 h por semana y 90 h en dos semanas, calculados al minuto." onClick={() => go('report')} cta="Ver mi informe" />
        <Feature title="Academia" text={`Ejercicios guiados con puntuación e insignias. Llevas ${basicDone} de 5 ejercicios iniciales.`} onClick={() => go('academy')} cta="Practicar" progress={basicDone / 5} />
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold text-slate-300">Las cuatro actividades</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIVITIES.map((a) => (
            <div key={a} className="glass flex items-center gap-3 rounded-2xl p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5" style={{ color: ACTIVITY_COLOR[a] }}>
                <ActivityIcon activity={a} className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{ACTIVITY_LABEL[a]}</span>
                <span className="block text-xs text-slate-400">{HINTS[a]}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-12 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-relaxed text-amber-100/80">
        <strong>Aviso:</strong> TachoLab EU es un simulador independiente con fines formativos. No está homologado, no reproduce ningún dispositivo comercial y no sustituye las instrucciones oficiales, la formación profesional ni los equipos instalados en los vehículos. Los cálculos normativos son orientativos.
      </p>
    </div>
  );
}

function Feature({ title, text, cta, onClick, progress }: { title: string; text: string; cta: string; onClick: () => void; progress?: number }) {
  return (
    <button type="button" onClick={onClick} className="glass group flex flex-col rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/10">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-400">{text}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${progress * 100}%` }} /></div>
      )}
      <span className="mt-4 text-sm font-medium text-cyan-300 group-hover:text-cyan-200">{cta} →</span>
    </button>
  );
}
