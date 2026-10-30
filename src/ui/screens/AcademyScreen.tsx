import { t } from '@/i18n';
import { useState } from 'react';
import { EXERCISES } from '@/academy/catalog';
import { useAcademyStore } from '@/academy/store';
import type { ExerciseDef } from '@/academy/types';
import { BADGES, earnedBadges } from '@/achievements/badges';
import { DEFAULT_ENTITLEMENTS, hasFeature } from '@/billing/plans';
import { Panel } from '../components/Panel';
import { useEntitlements, useUiStore } from '../uiStore';
import { confirmThen } from '../confirm';

/** Academia: ejercicios con objetivo, situación, condiciones de éxito, errores detectables y progreso. */
export function AcademyScreen() {
  const { progress, session, start } = useAcademyStore();
  const ent = useEntitlements();
  const go = useUiStore((s) => s.go);
  const [open, setOpen] = useState<string | null>(null);
  const earned = earnedBadges(progress);
  const freeDone = EXERCISES.filter((e) => e.feature === 'academy-basic' && progress[e.id]?.passed).length;

  const begin = (def: ExerciseDef) => {
    confirmThen(t('¿Empezar «{title}»? El ejercicio sustituye al escenario activo (guárdalo antes en Escenarios si quieres conservarlo).', { title: t(def.title) }), () => {
      start(def);
      go(def.quiz ? 'calendar' : 'device');
    }, { confirmLabel: t('Empezar') });
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        {session && !session.result && (
          <div className="rounded-xl border border-violet-700/50 bg-violet-950/30 p-3 text-sm text-violet-100">
            {t('Tienes un ejercicio en curso.')} <button type="button" className="underline" onClick={() => go('device')}>{t('Continuar')}</button>
          </div>
        )}
        <div data-testid="exercise-list" className="space-y-6">
        {[
          { title: t('Ejercicios iniciales'), subtitle: t('Gratis · aprende lo básico paso a paso'), items: EXERCISES.filter((e) => e.feature === 'academy-basic') },
          { title: t('Ejercicios avanzados'), subtitle: t('Premium · normativa en situaciones reales'), items: EXERCISES.filter((e) => e.feature !== 'academy-basic' && e.status === 'available') },
        ].map((group) => (
        <section key={group.title}>
          <h2 className="text-base font-semibold text-white">{group.title}</h2>
          <p className="mb-3 text-xs text-slate-400">{group.subtitle}</p>
        <ol className="space-y-2">
          {group.items.map((def) => {
            const p = progress[def.id];
            const isFree = hasFeature(DEFAULT_ENTITLEMENTS, def.feature);
            const allowed = hasFeature(ent, def.feature);
            const available = def.status === 'available';
            return (
              <li key={def.id} className="glass rounded-2xl">
                <button type="button" onClick={() => setOpen(open === def.id ? null : def.id)} aria-expanded={open === def.id} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="w-6 font-mono text-slate-500">{String(def.number).padStart(2, '0')}</span>
                  <span className="flex-1 text-slate-100">{t(def.title)}</span>
                  {p && <span className="text-amber-300" aria-label={`${p.stars} de 3 estrellas`}>{'★'.repeat(p.stars)}<span className="text-slate-700">{'★'.repeat(3 - p.stars)}</span></span>}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isFree ? 'bg-emerald-500/15 text-emerald-300' : 'bg-violet-500/15 text-violet-300'}`}>{isFree ? t('Gratis') : t('Premium')}</span>
                </button>
                {open === def.id && (
                  <div className="border-t border-white/10 px-4 py-3 text-sm">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <Item label={t('Objetivo')}>{t(def.objective)}</Item>
                      {available && <Item label={t('Situación inicial')}>{t(def.situation)}</Item>}
                      {available && <Item label={t('Estado del tacógrafo')}>{t(def.deviceState)}</Item>}
                      {available && def.success.length > 0 && (
                        <Item label={t('Condiciones de éxito')}><ul className="list-disc pl-4">{def.success.map((s) => <li key={s.text}>{t(s.text)}</li>)}</ul></Item>
                      )}
                      {available && def.errors.length > 0 && (
                        <Item label={t('Errores detectables')}><ul className="list-disc pl-4">{def.errors.map((e) => <li key={e.text}>{t(e.text)} (−{e.penalty})</li>)}</ul></Item>
                      )}
                    </dl>
                    {p && <p className="mt-2 text-xs text-slate-400">{t('Mejor puntuación: {score} · intentos: {n}', { score: p.bestScore, n: p.attempts })}</p>}
                    <button
                      type="button"
                      disabled={!available || !allowed}
                      onClick={() => begin(def)}
                      data-testid={`start-${def.id}`}
                      className="mt-3 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-slate-500"
                    >
                      {!available ? t('Próximamente') : !allowed ? t('Disponible en Premium') : p ? t('Repetir') : t('Empezar')}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        </section>
        ))}
        <section>
          <h2 className="text-base font-semibold text-white">{t('Próximamente')}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {EXERCISES.filter((e) => e.status === 'planned').map((e) => (
              <li key={e.id} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400" title={t(e.objective)}>
                {e.number}. {t(e.title)}
              </li>
            ))}
          </ul>
        </section>
        </div>
      </div>

      <div className="space-y-4">
        <Panel title={t('Tu progreso')}>
          <p className="text-sm text-slate-300"><span className="font-mono text-2xl text-white" data-testid="free-progress">{freeDone}/5</span> {t('ejercicios iniciales superados')}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded bg-ink-700"><div className="h-full bg-violet-400" style={{ width: `${(freeDone / 5) * 100}%` }} /></div>
        </Panel>
        <Panel title={t('Insignias ({n}/{total})', { n: earned.length, total: BADGES.length })}>
          <ul className="grid grid-cols-2 gap-2" data-testid="badges">
            {BADGES.map((b) => {
              const got = earned.includes(b);
              return (
                <li key={b.id} className={`rounded-lg border p-2 text-xs ${got ? 'border-amber-500/50 bg-amber-950/30 text-amber-100' : 'border-white/10 text-slate-500'}`} title={t(b.description)}>
                  <div className="font-semibold">{got ? '🏅 ' : ''}{t(b.title)}</div>
                  <div className="mt-0.5 text-[11px] opacity-80">{t(b.description)}</div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">{t('Las insignias premian lo que aprendes, no el tiempo de uso: no hay rachas ni recompensas por infringir.')}</p>
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
