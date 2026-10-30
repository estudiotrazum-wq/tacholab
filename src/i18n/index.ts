import { en } from './en';

/**
 * Traducciones al estilo gettext: el texto en español es el identificador del mensaje y cada
 * idioma tiene un catálogo «español → traducción». Los textos con datos llevan marcadores {nombre}.
 *
 * - t(id, params): traduce al idioma actual e interpola.
 * - N_(id): marca un texto para traducir sin traducirlo aún (datos que se traducen al mostrarse).
 * - tx(text, i18n): muestra un texto ya formado en español o, si hay identificador y parámetros,
 *   lo traduce (registros, avisos y hallazgos guardados en el estado de la simulación).
 */
export type Lang = 'es' | 'en';
export type Params = Record<string, string | number>;

export const LANGS: readonly { id: Lang; label: string; short: string }[] = [
  { id: 'es', label: 'Español', short: 'ES' },
  { id: 'en', label: 'English', short: 'EN' },
];

const CATALOGS: Record<Exclude<Lang, 'es'>, Readonly<Record<string, string>>> = { en };

let current: Lang = 'es';

export function setLang(lang: Lang): void {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

/** Idioma inicial: el del navegador si está disponible; español por defecto. */
export function detectLang(navigatorLang: string | undefined): Lang {
  const l = (navigatorLang ?? '').toLowerCase();
  if (l.startsWith('es') || l === '') return 'es';
  return 'en';
}

export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Traduce un mensaje (identificado por su texto en español) al idioma indicado. */
export function translate(lang: Lang, id: string, params?: Params): string {
  const text = lang === 'es' ? id : (CATALOGS[lang][id] ?? id);
  return interpolate(text, params);
}

export function t(id: string, params?: Params): string {
  return translate(current, id, params);
}

/** Marca de extracción: devuelve el texto tal cual (se traduce al mostrarse con t()). */
export function N_<T extends string>(id: T): T {
  return id;
}

/** Mensaje guardado en el estado: identificador (texto en español con marcadores) y parámetros. */
export interface I18nText {
  id: string;
  p?: Record<string, ParamValue>;
}
/** Un parámetro puede ser a su vez un mensaje traducible (p. ej. el texto de un aviso dentro del registro). */
export type ParamValue = string | number | I18nText;

/** Texto en español de un mensaje guardado (con mensajes anidados). */
export function spanish(m: I18nText): string {
  return interpolate(m.id, m.p ? Object.fromEntries(Object.entries(m.p).map(([k, v]) => [k, typeof v === 'object' ? spanish(v) : v])) : undefined);
}

/** Crea un texto en español ya interpolado junto con su identificador para traducirlo después. */
export function msg(id: string, p?: Record<string, ParamValue>): { text: string; i18n: I18nText } {
  const i18n: I18nText = p ? { id, p } : { id };
  return { text: spanish(i18n), i18n };
}

/**
 * Traduce el valor de un parámetro si es un texto conocido (país, actividad…). Admite la forma
 * «España (Madrid)»: traduce cada parte por separado.
 */
function translateParam(lang: Lang, v: ParamValue): string | number {
  if (typeof v === 'object') return translateMsg(lang, v);
  if (typeof v !== 'string' || lang === 'es') return v;
  const cat = CATALOGS[lang];
  if (v in cat) return cat[v]!;
  const m = /^(.+) \((.+)\)$/.exec(v);
  if (m) return `${cat[m[1]!] ?? m[1]} (${cat[m[2]!] ?? m[2]})`;
  return v;
}

/** Muestra un texto guardado: en español tal cual; en otro idioma, por su identificador o por el propio texto. */
export function tx(text: string, i18n?: I18nText): string {
  if (current === 'es') return text;
  return i18n ? translateMsg(current, i18n) : translate(current, text);
}

function translateMsg(lang: Lang, m: I18nText): string {
  if (lang === 'es') return spanish(m);
  const p = m.p ? Object.fromEntries(Object.entries(m.p).map(([k, v]) => [k, translateParam(lang, v)])) : undefined;
  return translate(lang, m.id, p);
}
