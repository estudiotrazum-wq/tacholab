import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { useUiStore } from '../uiStore';

/** Botón de sonido (menú lateral y cabecera móvil) con efectos, música country y volúmenes. */
export function SoundButton({ variant = 'rail' }: { variant?: 'rail' | 'header' }) {
  const ui = useUiStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const on = ui.sfxOn || ui.musicOn;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const icon = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4Z" />
      {on ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="m17 9 5 6M22 9l-5 6" />}
    </svg>
  );

  return (
    <div className="relative" ref={ref}>
      {variant === 'rail' ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          data-testid="sound-button"
          className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-medium transition ${open ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          {icon}
          Sonido
        </button>
      ) : (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Sonido" className="grid h-9 w-9 place-items-center rounded-full text-slate-300">
          {icon}
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-label="Sonido"
          className={`absolute z-50 w-72 rounded-2xl border border-white/10 bg-[#0b1220] p-4 text-sm shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] ${variant === 'rail' ? 'bottom-0 left-full ml-3' : 'right-0 top-full mt-2'}`}
        >
          <Toggle label="Efectos" desc="Teclas, tarjeta, impresora, avisos y motor del camión" checked={ui.sfxOn} onChange={(v) => { ui.update({ sfxOn: v }); sound.unlock(); }} testId="sfx-toggle" />
          <Toggle label="Música country" desc="«Ruta 561», melodía original de ambiente" checked={ui.musicOn} onChange={(v) => { sound.unlock(); ui.update({ musicOn: v }); }} testId="music-toggle" />
          <Range label="Volumen general" value={ui.volume} onChange={(v) => ui.update({ volume: v })} id="volume" />
          <Range label="Volumen de la música" value={ui.musicVolume} onChange={(v) => ui.update({ musicVolume: v })} id="music-volume" />
          <p className="mt-2 text-[11px] text-slate-500">Sonidos sintetizados en el navegador; el sonido empieza tras tu primer clic.</p>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange, testId }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <label className="mb-3 flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" data-testid={testId} />
      <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-300 ${checked ? 'bg-cyan-400' : 'bg-white/15'}`} aria-hidden="true">
        <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-4' : ''}`} />
      </span>
      <span>
        <span className="block font-medium text-white">{label}</span>
        <span className="block text-xs text-slate-400">{desc}</span>
      </span>
    </label>
  );
}

function Range({ label, value, onChange, id }: { label: string; value: number; onChange: (v: number) => void; id: string }) {
  return (
    <div className="mb-2">
      <label htmlFor={id} className="flex justify-between text-xs text-slate-300">
        {label}
        <span className="font-mono text-slate-400">{Math.round(value * 100)}%</span>
      </label>
      <input id={id} type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="tl-range mt-1 w-full" style={{ ['--pct' as string]: `${value * 100}%` }} />
    </div>
  );
}
