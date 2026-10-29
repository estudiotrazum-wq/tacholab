import { useMemo, type ReactNode } from 'react';
import { ACTIVITY_LABEL } from '@/shared/types';
import { renderDisplay } from '@/tachograph/display';
import type { Button } from '@/tachograph/types';
import type { AssistTarget } from '@/academy/assist';
import { useSimStore } from '@/simulator/store';
import { ActivityIcon, CardIcon } from './icons';

/**
 * Dispositivo ficticio "TL-1 EDU". Diseño original de TachoLab: no reproduce
 * carcasas, pantallas ni menús de ningún fabricante.
 */
export function Tachograph({ highlight, compact = false }: { highlight: AssistTarget; compact?: boolean }) {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const model = useMemo(() => renderDisplay(sim), [sim]);
  const press = (button: Button) => dispatch({ type: 'PRESS', button });
  const hl = (t: AssistTarget) => (highlight === t ? 'assist-target' : '');
  const cardId = sim.device.insertedCardId;

  return (
    <section
      aria-label="Tacógrafo educativo TL-1"
      className={`relative mx-auto w-full ${compact ? 'max-w-xl' : 'max-w-3xl'} rounded-2xl border border-ink-600 bg-gradient-to-b from-[#1d2836] to-[#0e151f] p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5`}
    >
      <div className="mb-3 flex items-center justify-between text-[10px] tracking-[0.25em] text-slate-500">
        <span className="font-semibold text-slate-400">TACHOLAB · TL-1 EDU</span>
        <span className="hidden sm:inline">SIMULADOR · NO HOMOLOGADO</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        {/* Pantalla */}
        <div
          className={`lcd-scan relative flex-1 rounded-lg border-2 p-3 font-mono ${
            model.mode === 'warning' ? 'border-amber-400/70 bg-[#1f1405]' : 'border-[#0b3a4a] bg-lcd-bg'
          }`}
          role="status"
          aria-live="polite"
          data-testid="tacho-display"
        >
          <div className={`flex items-center justify-between border-b pb-1 text-xs ${model.mode === 'warning' ? 'border-amber-500/40 text-amber-300' : 'border-cyan-900 text-cyan-300/80'}`}>
            <span className="lcd-glow" data-testid="display-title">{model.title}</span>
            <span className="flex items-center gap-2">
              {model.moving && <span className="rounded bg-cyan-400/15 px-1 text-[10px] text-cyan-200">EN MARCHA</span>}
              <CardIcon className={`h-4 w-4 ${model.cardIn ? 'text-lcd-fg' : 'text-cyan-900'}`} />
            </span>
          </div>
          <div className="mt-1.5 space-y-0.5 text-[15px] leading-6 sm:text-base">
            {model.lines.map((l, i) => (
              <div
                key={i}
                data-testid={`display-line-${i}`}
                className={`lcd-glow whitespace-pre rounded px-1 ${model.mode === 'warning' ? 'text-amber-200' : 'text-lcd-fg'} ${
                  model.cursor === i ? 'bg-cyan-300/15' : ''
                }`}
              >
                {model.cursor === i ? '›' : ' '}
                {l || ' '}
              </div>
            ))}
          </div>
          {/* Fila de indicadores de actividad */}
          <div className="mt-2 flex items-center gap-3 border-t border-cyan-900 pt-1.5" aria-label="Indicadores de actividad">
            {(['DRIVING', 'WORK', 'AVAILABILITY', 'REST'] as const).map((a) => {
              const isRec = model.recorded === a;
              const isSel = model.selected === a;
              return (
                <span
                  key={a}
                  className={`relative flex items-center ${isRec ? 'text-lcd-fg lcd-glow' : 'text-cyan-900'}`}
                  title={`${ACTIVITY_LABEL[a]}${isRec ? ' (registrada)' : ''}${isSel ? ' (seleccionada)' : ''}`}
                >
                  <ActivityIcon activity={a} className="h-5 w-5" title={ACTIVITY_LABEL[a]} />
                  {isSel && !isRec && <span className="absolute -bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 bg-cyan-500" />}
                </span>
              );
            })}
          </div>
        </div>

        {/* Botonera */}
        <div className="grid grid-cols-3 gap-2 sm:w-52 sm:grid-cols-2" role="group" aria-label="Botones del dispositivo">
          <DeviceButton label="Botón de actividad" onClick={() => press('ACTIVITY')} className={`col-span-3 sm:col-span-2 ${hl('ACTIVITY')}`} shortcut="A">
            <span className="flex items-center gap-1.5">
              <ActivityIcon activity="WORK" className="h-4 w-4" />
              <ActivityIcon activity="AVAILABILITY" className="h-4 w-4" />
              <ActivityIcon activity="REST" className="h-4 w-4" />
            </span>
          </DeviceButton>
          <DeviceButton label="Arriba" onClick={() => press('UP')} className={hl('UP_DOWN')} shortcut="↑">▲</DeviceButton>
          <DeviceButton label="Abajo" onClick={() => press('DOWN')} className={hl('UP_DOWN')} shortcut="↓">▼</DeviceButton>
          <DeviceButton label="Retroceder" onClick={() => press('BACK')} className={hl('BACK')} shortcut="Esc">✕</DeviceButton>
          <DeviceButton label="Confirmar / menú" onClick={() => press('OK')} className={`${hl('OK')} text-cyan-300`} shortcut="Enter">✓</DeviceButton>
          <DeviceButton label="Expulsar tarjeta" onClick={() => press('EJECT')} className={`col-span-2 sm:col-span-2 ${hl('EJECT')}`} shortcut="E">
            ⏏ <span className="ml-1 text-[11px] tracking-wider">TARJETA</span>
          </DeviceButton>
        </div>
      </div>

      {/* Ranura de tarjeta */}
      <CardSlot cardId={cardId} highlight={highlight === 'CARD_SLOT'} />
    </section>
  );
}

function DeviceButton({
  label,
  onClick,
  children,
  className = '',
  shortcut,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      className={`flex h-11 items-center justify-center rounded-lg border border-ink-600 bg-gradient-to-b from-[#2a3849] to-[#18222f] text-lg text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_0_#05080d] transition active:translate-y-[2px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-cyan-700 focus-visible:outline-2 focus-visible:outline-accent ${className}`}
    >
      {children}
    </button>
  );
}

function CardSlot({ cardId, highlight }: { cardId: string | null; highlight: boolean }) {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const card = cardId ? sim.cards[cardId] : null;
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        data-testid="card-slot"
        aria-label={card ? `Tarjeta insertada: ${card.holderName}` : 'Insertar tarjeta ficticia de Alex Prácticas'}
        onClick={() => !card && dispatch({ type: 'INSERT_CARD', cardId: 'card-a' })}
        className={`relative h-6 flex-1 overflow-hidden rounded-md border border-ink-600 bg-[#05090f] shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] ${highlight ? 'assist-target' : ''} ${card ? 'cursor-default' : 'cursor-pointer hover:border-cyan-700'}`}
      >
        <span className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-slate-700" />
        {card ? (
          <span className="absolute inset-y-0.5 left-6 flex items-center rounded-sm bg-gradient-to-r from-sky-700 to-cyan-600 px-3 text-[10px] font-semibold tracking-wider text-white">
            {card.displayId}
          </span>
        ) : (
          <span className="relative text-[10px] tracking-[0.3em] text-slate-500">RANURA · PULSA PARA INSERTAR</span>
        )}
      </button>
      <span className={`h-2 w-2 rounded-full ${card ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'}`} aria-hidden="true" />
    </div>
  );
}
