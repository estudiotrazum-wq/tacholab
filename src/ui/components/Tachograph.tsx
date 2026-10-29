import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ACTIVITY_LABEL } from '@/shared/types';
import { lcdPlain, renderDisplay } from '@/tachograph/display';
import type { Button } from '@/tachograph/types';
import type { AssistTarget } from '@/academy/assist';
import { useSimStore } from '@/simulator/store';
import { LcdLine } from './Lcd';

export const CARD_DRAG_TYPE = 'application/x-tacholab-card';

/** Tiempo que hay que mantener pulsada la tecla 1 para expulsar la tarjeta. */
const LONG_PRESS_MS = 1200;
/** Tiempo que la tarjeta expulsada asoma por la ranura antes de volver a la bandeja. */
const EJECT_SHOW_MS = 1800;

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
  const printout = sim.device.printout ?? null;
  // El ticket que ya existía al abrir la pantalla no vuelve a salir.
  const [cutSeq, setCutSeq] = useState(() => printout?.seq ?? 0);
  const ticket = printout && printout.seq > cutSeq ? printout.lines : null;
  const flash = (m: string) => {
    setHint(m);
    window.setTimeout(() => setHint(null), 3000);
  };

  const print = () => {
    if (!sim.device.insertedCardId) return flash('Para imprimir, inserta una tarjeta.');
    dispatch({ type: 'PRINT_DAILY' });
  };

  return (
    <section aria-label="Tacógrafo educativo TL-1" data-tour="tachograph" className={`relative mx-auto w-full ${compact ? 'max-w-2xl' : 'max-w-4xl'}`}>
      {/* Ticket impreso: sale por la ranura de la impresora */}
      {ticket && (
        <div className="absolute right-[4%] top-[34%] z-30 w-60 animate-[ticket_700ms_ease-out] rounded-b-sm border-t-4 border-dashed border-slate-400 bg-[#f7f5ee] px-3 pb-2 pt-3 font-mono text-[10px] leading-4 text-slate-800 shadow-2xl" data-testid="ticket">
          {ticket.map((l, i) => <div key={i} className="truncate">{l}</div>)}
          <button type="button" onClick={() => setCutSeq(printout?.seq ?? 0)} className="mt-2 w-full rounded border border-slate-400 py-1 text-[11px] text-slate-700 hover:bg-slate-200">✂ Cortar ticket</button>
        </div>
      )}

      {/* Bisel y frontal del equipo */}
      <div className="rounded-[14px] bg-gradient-to-b from-[#2a2d33] to-[#0d0f12] p-[6px] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.95)]">
        <div className="rounded-[10px] bg-gradient-to-b from-[#24272d] via-[#1b1d22] to-[#141619] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-2px_4px_rgba(0,0,0,0.5)] sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-4">
            {/* Pantalla */}
            <div data-tour="console">
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
              <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label="Teclas de menú" data-tour="keys">
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
 * Ranura con su tecla y su botón de expulsión, como en los tacógrafos reales:
 * - Tecla 1: pulsación corta = cambiar actividad; mantener pulsada = expulsar la tarjeta (la barra muestra el progreso).
 * - Botón ⏏ junto a la ranura: inicia directamente la retirada (país de fin → ¿imprimir? → expulsión).
 * Ranura 2: segundo conductor, para la conducción en equipo (módulo aún no disponible).
 */
function CardSlot({ slot, highlight, onHint }: { slot: 1 | 2; highlight: AssistTarget; onHint: (m: string) => void }) {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const [over, setOver] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const longDone = useRef(false);
  const card = slot === 1 && sim.device.insertedCardId ? sim.cards[sim.device.insertedCardId] : null;
  const unavailable = () => onHint('Ranura 2: segundo conductor (conducción en equipo). Disponible en una próxima versión.');

  // Al expulsarla, la tarjeta asoma un momento por la ranura antes de volver a la bandeja.
  const prevCard = useRef(card);
  const [ejected, setEjected] = useState<typeof card>(null);
  useEffect(() => {
    if (prevCard.current && !card) setEjected(prevCard.current);
    if (card) setEjected(null);
    prevCard.current = card;
  }, [card]);
  useEffect(() => {
    if (!ejected) return;
    const t = window.setTimeout(() => setEjected(null), EJECT_SHOW_MS);
    return () => window.clearTimeout(t);
  }, [ejected]);

  const eject = () => {
    if (slot === 2) return unavailable();
    if (!card) return onHint('La ranura 1 está vacía: no hay tarjeta que sacar.');
    dispatch({ type: 'PRESS', button: 'EJECT' });
  };
  const startPress = () => {
    longDone.current = false;
    if (!card) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      longDone.current = true;
      setHolding(false);
      dispatch({ type: 'PRESS', button: 'EJECT' });
    }, LONG_PRESS_MS);
  };
  const endPress = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  // Retirada en curso: la tarjeta parpadea en la ranura hasta que sale.
  const screen = sim.device.screen;
  const withdrawing = card !== null && (screen.kind === 'WITHDRAW_PRINT' || (screen.kind === 'COUNTRY' && screen.purpose === 'end'));

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={slot === 1 ? 'Botón de actividad' : 'Tecla 2 (segundo conductor)'}
        data-tour={slot === 1 ? 'activity' : undefined}
        title={slot === 1 ? 'Tecla 1: pulsa para cambiar la actividad (A). Mantén pulsada para sacar la tarjeta (E).' : 'Tecla 2: segundo conductor'}
        onPointerDown={slot === 1 ? startPress : undefined}
        onPointerUp={slot === 1 ? endPress : undefined}
        onPointerLeave={slot === 1 ? endPress : undefined}
        onPointerCancel={slot === 1 ? endPress : undefined}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (slot === 2) return unavailable();
          if (!longDone.current) dispatch({ type: 'PRESS', button: 'ACTIVITY' });
        }}
        className={`relative flex h-12 w-14 shrink-0 select-none flex-col items-center justify-center overflow-hidden rounded-md bg-gradient-to-b from-[#3a3e46] to-[#25282e] text-slate-100 shadow-[0_3px_0_#050608,inset_0_1px_0_rgba(255,255,255,0.12)] active:translate-y-[2px] ${slot === 1 ? (highlight === 'ACTIVITY' ? 'assist-target' : '') : 'opacity-60'}`}
      >
        <span className="text-base font-bold leading-none">{slot}</span>
        <span className="mt-0.5 text-[8px] tracking-wider text-slate-400">ACT · ⏏</span>
        {/* Progreso de la pulsación larga */}
        <span
          className="absolute inset-x-0 bottom-0 h-1 origin-left bg-amber-400"
          style={{ transform: `scaleX(${holding ? 1 : 0})`, transition: holding ? `transform ${LONG_PRESS_MS}ms linear` : 'none' }}
          aria-hidden="true"
          data-testid={slot === 1 ? 'hold-progress' : undefined}
        />
      </button>
      <button
        type="button"
        data-testid={slot === 1 ? 'card-slot' : 'card-slot-2'}
        data-tour={slot === 1 ? 'card-slot' : undefined}
        aria-label={
          slot === 2
            ? 'Ranura 2 (segundo conductor)'
            : card
              ? `Ranura 1: tarjeta de ${card.holderName} insertada`
              : `Ranura 1: arrastra aquí una tarjeta o pulsa para insertar la de ${sim.cards['card-a']?.holderName ?? 'conductor'}`
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
        className={`relative h-12 min-w-0 flex-1 rounded-md border bg-[#0a0b0d] shadow-[inset_0_3px_6px_rgba(0,0,0,0.9)] transition ${
          over ? 'border-cyan-300 ring-2 ring-cyan-400/60' : 'border-black/70'
        } ${slot === 1 && highlight === 'CARD_SLOT' ? 'assist-target' : ''} ${card ? 'cursor-default' : 'cursor-pointer hover:border-slate-500'}`}
      >
        {/* Boca de la ranura */}
        <span className="absolute inset-x-3 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black shadow-[0_1px_0_rgba(255,255,255,0.06)]" aria-hidden="true" />
        {card ? (
          <span className={`absolute inset-x-6 top-1/2 flex h-6 -translate-y-1/2 items-center justify-between rounded-sm bg-gradient-to-r from-sky-600 to-cyan-500 px-2 text-[10px] font-semibold text-white shadow ${withdrawing ? 'animate-pulse' : ''}`}>
            <span className="truncate">{card.holderName}</span>
            <span className="font-mono">{card.displayId.slice(-2)}</span>
          </span>
        ) : ejected ? (
          <span className="card-eject absolute inset-x-6 top-1/2 z-10 flex h-6 items-center justify-between rounded-sm bg-gradient-to-r from-sky-600 to-cyan-500 px-2 text-[10px] font-semibold text-white shadow-lg" data-testid="card-ejected">
            <span className="truncate">{ejected.holderName}</span>
          </span>
        ) : (
          <span className={`absolute bottom-1 left-0 right-0 text-center text-[9px] tracking-[0.2em] ${over ? 'text-cyan-200' : 'text-slate-500'}`}>
            {over ? 'SUELTA LA TARJETA' : slot === 1 ? 'TARJETA 1' : 'TARJETA 2'}
          </span>
        )}
      </button>
      {/* Botón de expulsión de la ranura */}
      <button
        type="button"
        onClick={eject}
        aria-label={slot === 1 ? 'Sacar tarjeta 1' : 'Sacar tarjeta 2'}
        title={slot === 1 ? 'Sacar la tarjeta del conductor (E)' : 'Sacar la tarjeta 2'}
        data-testid={`eject-${slot}`}
        data-tour={slot === 1 ? 'eject' : undefined}
        className={`relative flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-gradient-to-b from-[#3a3e46] to-[#25282e] shadow-[0_3px_0_#050608,inset_0_1px_0_rgba(255,255,255,0.12)] transition active:translate-y-[2px] ${
          card ? 'text-amber-300' : 'text-slate-500'
        } ${slot === 2 ? 'opacity-60' : ''} ${slot === 1 && highlight === 'EJECT' ? 'assist-target' : ''}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 5 4 15h16Z" /><rect x="4" y="17" width="16" height="2.5" rx="1" /></svg>
        <span className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${card ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-700'}`} aria-label={card ? `Actividad: ${ACTIVITY_LABEL[sim.device.selected]}` : undefined} />
      </button>
    </div>
  );
}
