import type { AssistTarget } from '@/academy/assist';
import { useSimStore } from '@/simulator/store';
import { useState } from 'react';
import { PERSONAL_CARD_ID } from '@/scenarios/cards';
import { CARD_DRAG_TYPE } from './Tachograph';
import { DriverNameField } from './DriverNameField';
import { useUiStore } from '../uiStore';

const CARD_STYLES = ['from-sky-500 via-cyan-500 to-teal-400', 'from-violet-500 via-fuchsia-500 to-pink-400'];

/**
 * Bandeja de tarjetas ficticias: se arrastran a la ranura del tacógrafo (o se
 * pulsan). Diseño propio de tarjeta, sin imitar documentos oficiales.
 */
export function CardTray({ highlight, horizontal = false }: { highlight: AssistTarget; horizontal?: boolean }) {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const inserted = sim.device.insertedCardId;
  const cards = Object.values(sim.cards);
  const named = useUiStore((s) => s.driverName !== '');
  const [editing, setEditing] = useState(false);

  return (
    <section aria-label="Tarjetas de conductor ficticias" className="glass rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-white">Tarjetas</h2>
      <p className="mt-0.5 text-xs text-slate-400">Arrástrala a la ranura del tacógrafo o púlsala.</p>
      <ul className={`mt-3 gap-3 ${horizontal ? 'grid max-w-md grid-cols-2' : 'flex flex-col'}`}>
        {cards.map((c, i) => {
          const isIn = inserted === c.id;
          const busy = inserted !== null && !isIn;
          const pulse = highlight === 'CARD_SLOT' && i === 0 && !inserted;
          return (
            <li key={c.id}>
              {isIn ? (
                <button
                  type="button"
                  data-testid={`card-${c.id}`}
                  onClick={() => dispatch({ type: 'PRESS', button: 'EJECT' })}
                  aria-label={`Sacar la tarjeta de ${c.holderName}`}
                  className={`flex aspect-[1.586] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-emerald-400/50 text-center text-xs text-emerald-200 transition hover:bg-emerald-400/10 ${highlight === 'EJECT' ? 'assist-target' : ''}`}
                >
                  <span className="font-semibold">{c.holderName}</span>
                  <span className="text-emerald-300/80">está en el tacógrafo</span>
                  <span className="mt-1 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px]">⏏ Sacar tarjeta</span>
                </button>
              ) : (
              <button
                type="button"
                draggable={!inserted}
                data-testid={`card-${c.id}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData(CARD_DRAG_TYPE, c.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => dispatch({ type: 'INSERT_CARD', cardId: c.id })}
                disabled={busy}
                aria-label={`Insertar la tarjeta de ${c.holderName}`}
                className={`relative block aspect-[1.586] w-full overflow-hidden rounded-xl p-3 text-left text-white shadow-lg transition ${pulse ? 'assist-target' : ''} ${
                  busy ? 'cursor-not-allowed opacity-30' : 'cursor-grab hover:-translate-y-0.5 hover:shadow-cyan-500/20 active:cursor-grabbing'
                } bg-gradient-to-br ${CARD_STYLES[i % CARD_STYLES.length]}`}
              >
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(255,255,255,0.35),transparent_45%)]" aria-hidden="true" />
                <span className="relative flex h-full flex-col justify-between">
                  <span className="flex items-start justify-between text-[9px] font-semibold uppercase tracking-[0.15em] text-white/85">
                    <span>Tarjeta de conductor<br />ficticia</span>
                    <span className="rounded bg-black/20 px-1">SIM</span>
                  </span>
                  <span className="block h-5 w-7 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 shadow-inner" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{c.holderName}</span>
                    <span className="block font-mono text-[10px] tracking-wider text-white/85">{c.displayId}</span>
                  </span>
                </span>
              </button>
              )}
              {c.id === PERSONAL_CARD_ID && !editing && (
                <button type="button" onClick={() => setEditing(true)} className="mt-1.5 text-[11px] text-cyan-300 hover:text-cyan-200" data-testid="edit-name">
                  ✎ {named ? 'Cambiar mi nombre' : 'Poner mi nombre en esta tarjeta'}
                </button>
              )}
              {c.id === PERSONAL_CARD_ID && editing && (
                <div className="mt-2">
                  <DriverNameField compact autoFocus onSaved={() => setEditing(false)} />
                  <button type="button" onClick={() => setEditing(false)} className="mt-1 text-[11px] text-slate-400 hover:text-white">Cancelar</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
