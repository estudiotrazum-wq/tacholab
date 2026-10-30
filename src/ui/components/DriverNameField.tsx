import { t } from '@/i18n';
import { useState } from 'react';
import { PERSONAL_CARD_ID, HOLDER_NAME_MAX, normalizeHolderName } from '@/scenarios/cards';
import { useSimStore } from '@/simulator/store';
import { setDriverName } from '../driverName';
import { useUiStore } from '../uiStore';

/** Campo para que el alumno ponga su nombre en la tarjeta ficticia. */
export function DriverNameField({ compact = false, onSaved, autoFocus = false }: { compact?: boolean; onSaved?: () => void; autoFocus?: boolean }) {
  const saved = useUiStore((s) => s.driverName);
  const current = useSimStore((s) => s.sim.cards[PERSONAL_CARD_ID]?.holderName ?? '');
  const [value, setValue] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const err = setDriverName(value);
        setError(err);
        setOk(!err);
        if (!err) onSaved?.();
      }}
      data-testid="driver-name-form"
    >
      {!compact && (
        <label htmlFor="driver-name" className="mb-1 block text-xs font-medium text-slate-300">
          {t('Tu nombre en la tarjeta')}
        </label>
      )}
      <div className="flex gap-2">
        <input
          id="driver-name"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            setError(null);
            // Se guarda mientras se escribe (si es válido): no hace falta pulsar «Guardar» para no perderlo.
            setOk(normalizeHolderName(v) !== null && setDriverName(v) === null);
          }}
          onBlur={() => value.trim() && setError(setDriverName(value))}
          maxLength={HOLDER_NAME_MAX + 4}
          placeholder={current || t('Tu nombre')}
          autoComplete="given-name"
          autoFocus={autoFocus}
          aria-label={t('Tu nombre en la tarjeta')}
          aria-invalid={error ? true : undefined}
          data-testid="driver-name"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/60 focus:outline-none"
        />
        <button type="submit" className="shrink-0 rounded-xl bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300" data-testid="driver-name-save">
          {ok ? t('✓ Guardado') : t('Guardar')}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-300" role="alert">{error}</p>
      ) : (
        <p className="mt-1 text-[11px] text-slate-500">{t('Solo se guarda en este navegador; la tarjeta sigue siendo ficticia. Puedes borrarlo en Ajustes.')}</p>
      )}
    </form>
  );
}
