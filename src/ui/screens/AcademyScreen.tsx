import { useState } from 'react';
import { EXERCISES } from '@/academy/catalog';
import { useAcademyStore } from '@/academy/store';
import type { ExerciseDef } from '@/academy/types';
import { BADGES, earnedBadges } from '@/achievements/badges';
import { DEFAULT_ENTITLEMENTS, hasFeature } from '@/billing/plans';
import { Panel } from '../components/Panel';
import { useEntitlements, useUiStore } from '../uiStore';

/** Academia: ejercicios con objetivo, situación, condiciones de éxito, errores detectables y progreso. */
export function AcademyScreen() {
  const { progress, session, start } = useAcademyStore();
  const ent = useEntitlements();
  const go = useUiStore((s) => s.go);
  const [open, setOpen] = useState<string | null>(null);
  const earned = earnedBadges(progress);
  const freeDone = EXERCISES.filter((e) => e.feature === 'academy-basic' && progress[e.id]?.passed).length;

  const begin = (def: ExerciseDef) => {
    if (!window.confirm(`¿Empezar «${def.title}»? El ejercicio sustituye al escenario activo (guárdalo antes en Escenarios si quieres conservarlo).`)) return;
    start(def);
    go(def.quiz ? 'calendar' : 'device');
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        {session && !session.result && (
          <div className="rounded-xl border border-violet-700/50 bg-violet-950/30 p-3 text-sm text-violet-100">
            Tienes un ejercicio en curso. <button type="button" className="underline" onClick={() => go('device')}>Continuar</button>
          </div>
        )}
        <ol className="space-y-2" data-testid="exercise-list">
          {EXERCISES.map((def) => {
            const p = progress[def.id];
            const isFree = hasFeature(DEFAULT_ENTITLEMENTS, def.feature);
            const allowed = hasFeature(ent, def.feature);
            const available = def.status === 'available';
            return (
              <li key={def.id} className="rounded-xl border border-ink-700 bg-ink-900/70">
                <button type="button" onClick={() => setOpen(open === def.id ? null : def.id)} aria-expanded={open === def.id} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="w-6 font-mono text-slate-500">{String(def.number).padStart(2, '0')}</span>
                  <span className="flex-1 text-slate-100">{def.title}</span>
                  {p && <span className="text-amber-300" aria-label={`${p.stars} de 3 estrellas`}>{'★'.repeat(p.stars)}<span className="text-slate-700">{'★'.repeat(3 - p.stars)}</span></span>}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isFree ? 'bg-emerald-500/15 text-emerald-300' : 'bg-violet-500/15 text-violet-300'}`}>{isFree ? 'Gratis' : 'Premium'}</span>
                  {!available && <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">Próximamente</span>}
                </button>
                {open === def.id && (
                  <div className="border-t border-ink-700 px-4 py-3 text-sm">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <Item label="Objetivo">{def.objective}</Item>
                      {available && <Item label="Situación inicial">{def.situation}</Item>}
                      {available && <Item label="Estado del tacógrafo">{def.deviceState}</Item>}
                      {available && def.success.length > 0 && (
                        <Item label="Condiciones de éxito"><ul className="list-disc pl-4">{def.success.map((s) => <li key={s.text}>{s.text}</li>)}</ul></Item>
                      )}
                      {available && def.errors.length > 0 && (
                        <Item label="Errores detectables"><ul className="list-disc pl-4">{def.errors.map((e) => <li key={e.text}>{e.text} (−{e.penalty})</li>)}</ul></Item>
                      )}
                    </dl>
                    {p && <p className="mt-2 text-xs text-slate-400">Mejor puntuación: {p.bestScore} · intentos: {p.attempts}</p>}
                    <button
                      type="button"
                      disabled={!available || !allowed}
                      onClick={() => begin(def)}
                      data-testid={`start-${def.id}`}
                      className="mt-3 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-slate-500"
                    >
                      {!available ? 'Próximamente' : !allowed ? 'Disponible en Premium' : p ? 'Repetir' : 'Empezar'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-4">
        <Panel title="Tu progreso">
          <p className="text-sm text-slate-300"><span className="font-mono text-2xl text-white" data-testid="free-progress">{freeDone}/5</span> ejercicios iniciales superados</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded bg-ink-700"><div className="h-full bg-violet-400" style={{ width: `${(freeDone / 5) * 100}%` }} /></div>
        </Panel>
        <Panel title={`Insignias (${earned.length}/${BADGES.length})`}>
          <ul className="grid grid-cols-2 gap-2" data-testid="badges">
            {BADGES.map((b) => {
              const got = earned.includes(b);
              return (
                <li key={b.id} className={`rounded-lg border p-2 text-xs ${got ? 'border-amber-500/50 bg-amber-950/30 text-amber-100' : 'border-ink-700 text-slate-500'}`} title={b.description}>
                  <div className="font-semibold">{got ? '🏅 ' : ''}{b.title}</div>
                  <div className="mt-0.5 text-[11px] opacity-80">{b.description}</div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">Las insignias premian lo que aprendes, no el tiempo de uso: no hay rachas ni recompensas por infringir.</p>
        </Panel>
      </div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-slate-300">{children}</dd>
    </div>
  );
}
