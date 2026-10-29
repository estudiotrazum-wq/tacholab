import { useUiStore } from '../uiStore';
import { ActivityIcon } from '../components/icons';

export function HomeScreen() {
  const go = useUiStore((s) => s.go);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">Simulador educativo</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">TachoLab EU</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-300">
        Aprende a manejar un tacógrafo digital genérico y a entender los tiempos de conducción y descanso, practicando en una cabina virtual con reloj acelerado.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => go('cabin')} className="rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-ink-950 hover:bg-cyan-400">
          Entrar en la cabina
        </button>
        <button type="button" onClick={() => go('device')} className="rounded-lg border border-ink-600 px-5 py-3 text-slate-200 hover:border-cyan-600">
          Ir directo al tacógrafo
        </button>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ['DRIVING', 'Conducción', 'Se registra sola cuando el vehículo se mueve.'],
          ['WORK', 'Otros trabajos', 'Carga, descarga, comprobaciones. No es pausa.'],
          ['AVAILABILITY', 'Disponibilidad', 'Esperas definidas. No equivale a descanso.'],
          ['REST', 'Pausa / descanso', 'Su validez depende de duración y continuidad.'],
        ] as const).map(([a, t, d]) => (
          <div key={a} className="rounded-xl border border-ink-700 bg-ink-900/70 p-4">
            <ActivityIcon activity={a} className="h-7 w-7 text-cyan-300" />
            <h2 className="mt-2 font-semibold text-white">{t}</h2>
            <p className="mt-1 text-sm text-slate-400">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100/90">
        <strong>Aviso:</strong> TachoLab EU es un simulador independiente con fines formativos. No está homologado, no reproduce ningún
        dispositivo comercial y no sustituye las instrucciones oficiales, la formación profesional ni los equipos instalados en los vehículos.
        Los cálculos normativos son preliminares y están pendientes de validación.
      </div>
    </div>
  );
}
