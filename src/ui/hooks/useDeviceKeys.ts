import { useEffect } from 'react';
import { sound } from '../audio/sound';
import { useSimStore } from '@/simulator/store';
import type { Button } from '@/tachograph/types';

const KEYMAP: Record<string, Button> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  Enter: 'OK',
  Escape: 'BACK',
  a: 'ACTIVITY',
  e: 'EJECT',
};

/** Atajos de teclado del tacógrafo y del vehículo (vista Tacógrafo y cámara del tacógrafo en la cabina). */
export function useDeviceKeys(enabled = true): void {
  const dispatch = useSimStore((s) => s.dispatch);
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      // Enter y Espacio sobre un control enfocado conservan su comportamiento nativo.
      if ((e.key === 'Enter' || e.key === ' ') && el.closest('button, [role="button"]')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const button = KEYMAP[key];
      const state = useSimStore.getState().sim;
      if (button) {
        e.preventDefault();
        sound.beep();
        dispatch({ type: 'PRESS', button });
      } else if (key === 'm') {
        dispatch({ type: 'SET_MOVING', moving: !state.vehicle.moving });
      } else if (key === 'k') {
        const ig = state.vehicle.ignition ?? 'off';
        dispatch({ type: 'SET_IGNITION', position: ig === 'off' ? 'on' : ig === 'on' ? 'start' : 'off' });
      } else if (key === 'i') {
        dispatch({ type: 'INSERT_CARD', cardId: 'card-a' });
      } else if (key === ' ') {
        e.preventDefault();
        dispatch({ type: 'SET_SPEED', speed: state.clock.speed === 0 ? 60 : 0 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, enabled]);
}
