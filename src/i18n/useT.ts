import { useCallback } from 'react';
import { useUiStore } from '@/ui/uiStore';
import { translate, type Params } from './index';

/** t() reactivo: vuelve a pintar el componente al cambiar de idioma. */
export function useT(): (id: string, params?: Params) => string {
  const lang = useUiStore((s) => s.lang);
  return useCallback((id: string, params?: Params) => translate(lang, id, params), [lang]);
}
