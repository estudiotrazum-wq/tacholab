import { academy } from './en/academy';
import { content } from './en/content';
import { device } from './en/device';
import { guide } from './en/guide';
import { rules } from './en/rules';
import { ui } from './en/ui';

/** Catálogo inglés: texto en español → traducción (repartido por áreas). */
export const en: Readonly<Record<string, string>> = { ...device, ...rules, ...content, ...academy, ...ui, ...guide };
