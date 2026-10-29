import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ACTIVITY_LABEL } from '@/shared/types';
import { lcdPlain, renderDisplay, ticketLines } from '@/tachograph/display';
import type { Button } from '@/tachograph/types';
import type { AssistTarget } from '@/academy/assist';
import { deriveSummary } from '@/simulator/derived';
import { useSimStore } from '@/simulator/store';
import { formatDateTime } from '@/time-engine/zoned';
import { LcdLine } from './Lcd';

export const CARD_DRAG_TYPE = 'application/x-tacholab-card';

/** Tiempo que hay que mantener pulsada la tecla 1 para expulsar la tarjeta. */
const LONG_PRESS_MS = 900;

/**
 * Tacógrafo ficticio «TL-1 EDU» en formato DIN, con los elementos comunes a
 * los equipos digitales europeos: pantalla de 2 líneas, teclas de menú, dos
 * ranuras de tarjeta con su tecla e impresora. Diseño propio: no reproduce la
 * carcasa, las pantallas ni los menús de ningún fabricante.
 */
export function Tachograph({ highlight, compact = false }: { highlight: AssistTarget; compact?: boolean }) {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const model = useMemo(() => renderDisplay(sim), [sim]);
  const press = (button: Button) => dispatch({ type: 'PRESS', button });
  const hl = (t: AssistTarget) => (highlight === t ? 'assist-target' : '');
  const [hint, setHint] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string[] | null>(null);
  const flash = (m: string) => {
    setHint(m);
    window.setTimeout(() => setHint(null), 3000);
  };

  const print = () => {
    const sum = deriveSummary(sim);
    if (!sum.driverId) return flash('Para imprimir, inserta una tarjeta.');
    const tz = sim.scenario.timeZone;
    setTicket([`TL-1 EDU · ${formatDateTime(sim.clock.now, tz)} UTC`, 'IMPRESIÓN DIARIA (24 h)', '────────────────────', ...ticketLines(sim, sum)]);
  };

  return (
    <section aria-label="Tacógrafo educativo TL-1" className={`relative mx-auto w-full ${compact ? 'max-w-2xl' : 'max-w-4xl'}`}>
      {/* Ticket impreso: sale por la ranura de la impresora */}
      {ticket && (
        <div className="absolute right-[4%] top-[34%] z-30 w-60 animate-[ticket_700ms_ease-out] rounded-b-sm border-t-4 border-dashed border-slate-400 bg-[#f7f5ee] px-3 pb-2 pt-3 font-mono text-[10px] leading-4 text-slate-800 shadow-2xl" data-testid="ticket">
          {ticket.map((l, i) => <div key={i} className="truncate">{l}</div>)}
          <button type="button" onClick={() => setTicket(null)} className="mt-2 w-full rounded border border-slate-400 py-1 text-[11px] text-slate-700 hover:bg-slate-200">✂ Cortar ticket</button>
        </div>
      )}

      {/* Bisel y frontal del equipo */}
      <div className="rounded-[14px] bg-gradient-to-b from-[#2a2d33] to-[#0d0f12] p-[6px] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.95)]">
        <div className="rounded-[10px] bg-gradient-to-b from-[#24272d] via-[#1b1d22] to-[#141619] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-2px_4px_rgba(0,0,0,0.5)] sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-4">
            {/* Pantalla */}
            <div>
              <div
                className={`relative overflow-hidden rounded-md border-[3px] border-[#0b0c0e] px-3 py-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.55)] ${model.mode === 'warning' ? 'lcd-warning' : ''}`}
                style={{ background: model.backlight ? 'linear-gradient(180deg, #c9d67a 0%, #b4c262 100%)' : 'linear-gradient(180deg, #7d8456 0%, #6c7349 100%)', transition: 'background 400ms' }}
                data-backlight={model.backlight ? 'on' : 'off'}
                role="status"
                aria-live="polite"
                aria-label={`Pantalla: ${lcdPlain(model.lines[0]).trim()} / ${lcdPlain(model.lines[1]).trim()}`}
                data-testid="tacho-display"
              >
                <div className="lcd-text text-[clamp(1.25rem,4.2vw,2.15rem)] leading-[1.05] text-[#1d2610]" style={{ fontFamily: '"VT323", ui-monospace, monospace' }}>
                  <LcdLine text={model.lines[0]} testId="display-line-0" />
                  <LcdLine text={model.lines[1]} testId="display-line-1" />
                </div>
                <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.05)_0_1px,transparent_1px_3px),repeating-linear-gradient(90deg,rgba(0,0,0,0.04)_0_1px,transparent_1px_3px)]" aria-hidden="true" />
              </div>
              {/* Teclas de menú */}
              <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label="Teclas de menú">
                <Key label="Retroceder" onClick={() => press('BACK')} className={hl('BACK')} shortcut="Esc">✕</Key>
                <Key label="Arriba" onClick={() => press('UP')} className={hl('UP_DOWN')} shortcut="↑">▲</Key>
                <Key label="Abajo" onClick={() => press('DOWN')} className={hl('UP_DOWN')} shortcut="↓">▼</Key>
                <Key label="Confirmar / menú" onClick={() => press('OK')} className={hl('OK')} shortcut="Enter">OK</Key>
              </div>
            </div>

            {/* Impresora y rótulos */}
            <div className="flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between text-[9px] font-semibold tracking-[0.2em] text-slate-500">
                <span>TL-1 EDU</span>
                <span className="text-right">SIMULADOR<br />NO HOMOLOGADO</span>
              </div>
              <div className="rounded-md border border-black/60 bg-[#101215] p-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                <div className="h-1.5 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]" aria-hidden="true" />
                <div className="mt-1 h-1 bg-[repeating-linear-gradient(90deg,#3a3d44_0_3px,transparent_3px_6px)]" aria-hidden="true" />
                <button type="button" onClick={print} aria-label="Imprimir el resumen diario" data-testid="print" className="mt-2 flex w-full items-center justify-center gap-1.5 rounded bg-gradient-to-b from-[#363a42] to-[#24272d] py-1.5 text-[11px] text-slate-200 shadow-[0_2px_0_#000] active:translate-y-px">
                  <span aria-hidden="true">⎙</span> Imprimir
                </button>
              </div>
            </div>
          </div>

          {/* Ranuras de tarjeta 1 y 2 con su tecla */}
          <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2">
            <CardSlot slot={1} highlight={highlight} onHint={flash} />
            <CardSlot slot={2} highlight={highlight} onHint={flash} />
          </div>
        </div>
      </div>
      {hint && <p className="mt-2 text-center text-xs text-amber-200" role="status">{hint}</p>}
    </section>
  );
}

function Key({ label, onClick, children, className = '', shortcut }: { label: string; onClick: () => void; children: ReactNode; className?: string; shortcut?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      className={`flex h-10 items-center justify-center rounded-md bg-gradient-to-b from-[#3a3e46] to-[#25282e] text-sm font-semibold text-slate-200 shadow-[0_3px_0_#050608,inset_0_1px_0_rgba(255,255,255,0.12)] transition active:translate-y-[2px] active:shadow-[0_1px_0_#050608] focus-visible:outline-2 focus-visible:outline-cyan-400 ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Ranura con su tecla. Ranura 1: conductor (tecla 1 = actividad; mantener = expulsar).
 * Ranura 2: segundo conductor, para la conducción en equipo (módulo aún no disponible).
 */
function CardSlot({ slot, highlight, onHint }: { slot: 1 | 2; highlight: AssistTarget; onHint: (m: string) => void }) {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const [over, setOver] = useState(false);
  const timer = useRef<number | null>(null);
  const longDone = useRef(false);
  const card = slot === 1 && sim.device.insertedCardId ? sim.cards[sim.device.insertedCardId] : null;
  const unavailable = () => onHint('Ranura 2: segundo conductor (conducción en equipo). Disponible en una próxima versión.');

  const startPress = () => {
    longDone.current = false;
    timer.current = window.setTimeout(() => {
      longDone.current = true;
      dispatch({ type: 'PRESS', button: 'EJECT' });
    }, LONG_PRESS_MS);
  };
  const endPress = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={slot === 1 ? 'Botón de actividad' : 'Tecla 2 (segundo conductor)'}
        title={slot === 1 ? 'Tecla 1: cambia la actividad (A). Mantén pulsado para sacar la tarjeta (E).' : 'Tecla 2: segundo conductor'}
        onPointerDown={slot === 1 ? startPress : undefined}
        onPointerUp={slot === 1 ? endPress : undefined}
        onPointerLeave={slot === 1 ? endPress : undefined}
        onClick={() => {
          if (slot === 2) return unavailable();
          if (!longDone.current) dispatch({ type: 'PRESS', button: 'ACTIVITY' });
        }}
        className={`flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-gradient-to-b from-[#3a3e46] to-[#25282e] text-slate-100 shadow-[0_3px_0_#050608,inset_0_1px_0_rgba(255,255,255,0.12)] active:translate-y-[2px] ${slot === 1 ? (highlight === 'ACTIVITY' || highlight === 'EJECT' ? 'assist-target' : '') : 'opacity-60'}`}
      >
        <span className="text-base font-bold leading-none">{slot}</span>
        <span className="mt-0.5 text-[8px] tracking-wider text-slate-400">{slot === 1 ? 'ACT · ⏏' : 'ACT · ⏏'}</span>
      </button>
      <button
        type="button"
        data-testid={slot === 1 ? 'card-slot' : 'card-slot-2'}
        aria-label={
          slot === 2
            ? 'Ranura 2 (segundo conductor)'
            : card
              ? `Ranura 1: tarjeta de ${card.holderName} insertada`
              : 'Ranura 1: arrastra aquí una tarjeta o pulsa para insertar la de Alex Prácticas'
        }
        onClick={() => {
          if (slot === 2) return unavailable();
          if (!card) dispatch({ type: 'INSERT_CARD', cardId: 'card-a' });
        }}
        onDragOver={(e) => {
          if (card || !e.dataTransfer.types.includes(CARD_DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (slot === 2) return unavailable();
          const id = e.dataTransfer.getData(CARD_DRAG_TYPE);
          if (id) dispatch({ type: 'INSERT_CARD', cardId: id });
        }}
        className={`relative h-12 min-w-0 flex-1 overflow-hidden rounded-md border bg-[#0a0b0d] shadow-[inset_0_3px_6px_rgba(0,0,0,0.9)] transition ${
          over ? 'border-cyan-300 ring-2 ring-cyan-400/60' : 'border-black/70'
        } ${slot === 1 && highlight === 'CARD_SLOT' ? 'assist-target' : ''} ${card ? 'cursor-default' : 'cursor-pointer hover:border-slate-500'}`}
      >
        {/* Boca de la ranura */}
        <span className="absolute inset-x-3 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black shadow-[0_1px_0_rgba(255,255,255,0.06)]" aria-hidden="true" />
        {card ? (
          <span className="absolute inset-x-6 top-1/2 flex h-6 -translate-y-1/2 items-center justify-between rounded-sm bg-gradient-to-r from-sky-600 to-cyan-500 px-2 text-[10px] font-semibold text-white shadow">
            <span className="truncate">{card.holderName}</span>
            <span className="font-mono">{card.displayId.slice(-2)}</span>
          </span>
        ) : (
          <span className={`absolute bottom-1 left-0 right-0 text-center text-[9px] tracking-[0.2em] ${over ? 'text-cyan-200' : 'text-slate-500'}`}>
            {over ? 'SUELTA LA TARJETA' : slot === 1 ? 'TARJETA 1 · CONDUCTOR' : 'TARJETA 2 · SEGUNDO CONDUCTOR'}
          </span>
        )}
      </button>
      <span className={`h-2 w-2 shrink-0 rounded-full ${card ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'}`} aria-label={card ? `Actividad: ${ACTIVITY_LABEL[sim.device.selected]}` : undefined} />
    </div>
  );
}
