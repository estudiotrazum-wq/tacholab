import { Fragment } from 'react';

/** Pictogramas de la pantalla, dibujados a la altura de una celda del LCD. */
const GLYPHS: Record<string, JSX.Element> = {
  '{D}': (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="6" cy="7" r="4.6" />
      <circle cx="6" cy="7" r="1.1" fill="currentColor" />
      <path d="M1.6 6h3.2M7.2 6h3.2M6 8.2v3.4" />
    </g>
  ),
  '{W}': (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 12 8.5 5.5M8 3l2-1 2 2-1 2M10 12 3.5 5.5M4 3 2 2 0 4l1 2" transform="translate(0 0.5)" />
    </g>
  ),
  '{A}': (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="2.5" width="9" height="9" />
      <path d="M1.5 11.5 10.5 2.5" />
    </g>
  ),
  '{R}': (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12V4M1 9.5h10V12M11 9.5V8a1.5 1.5 0 0 0-1.5-1.5H5v3" />
      <circle cx="3" cy="7.2" r="1" fill="currentColor" />
    </g>
  ),
  '{C}': (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1" y="3" width="10" height="8" rx="1" />
      <rect x="2.6" y="5.2" width="3" height="2.6" fill="currentColor" stroke="none" />
    </g>
  ),
  '{L}': (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="7" r="4.5" />
      <circle cx="6" cy="7" r="1.2" fill="currentColor" />
    </g>
  ),
  // Modo de funcionamiento «operativo» (conductor): camión con volante, diseño propio
  '{O}': (
    <g fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="0.8" y="3" width="6.4" height="6.5" />
      <path d="M7.2 5h2.6l1.4 2.4v2.1H7.2" />
      <circle cx="3" cy="11" r="1.2" fill="currentColor" />
      <circle cx="9" cy="11" r="1.2" fill="currentColor" />
    </g>
  ),
  // Trayecto en transbordador/tren
  '{F}': (
    <g fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M1 8.5h10l-1.6 2.5H2.6Z" fill="currentColor" />
      <path d="M3 8.5V5.5h6v3M5.5 5.5V3" />
      <path d="M0.5 12.6q1.4-1 2.8 0t2.8 0 2.8 0 2.8 0" />
    </g>
  ),
  // Fuera de ámbito
  '{X}': (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="6" cy="7" r="4.6" />
      <path d="M2.8 10.2 9.2 3.8" />
    </g>
  ),
};
const LETTERS: Record<string, string> = { '{U}': 'U', '{?}': '?', '{M}': 'M' };

/** Una línea del LCD: texto en fuente de matriz de puntos y pictogramas en línea. */
export function LcdLine({ text, testId }: { text: string; testId?: string }) {
  const parts = text.split(/(\{[DWARCLU?MOFX]\})/);
  return (
    <div className="lcd-line whitespace-pre" data-testid={testId}>
      {parts.map((p, i) => {
        if (GLYPHS[p]) {
          return (
            <svg key={i} viewBox="0 0 12 14" className="inline-block h-[0.82em] w-[0.5em] align-[-0.05em]" aria-hidden="true">
              {GLYPHS[p]}
            </svg>
          );
        }
        if (LETTERS[p]) return <Fragment key={i}>{LETTERS[p]}</Fragment>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </div>
  );
}
