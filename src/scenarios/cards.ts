/** Tarjetas de conductor FICTICIAS. Nunca se solicitan números reales. */
export interface FictionalCard {
  id: string;
  /** Identificador mostrado, deliberadamente con prefijo SIM para no parecer real. */
  displayId: string;
  holderName: string;
  /** Último instante de retirada (para ofrecer la entrada manual). */
  lastWithdrawalAt: number | null;
}

export const DEFAULT_CARDS: readonly FictionalCard[] = [
  { id: 'card-a', displayId: 'SIM-ES-0000-A1', holderName: 'Alex Prácticas', lastWithdrawalAt: null },
  { id: 'card-b', displayId: 'SIM-ES-0000-B2', holderName: 'Sam Formación', lastWithdrawalAt: null },
];

/** Tarjeta que el alumno personaliza con su nombre. */
export const PERSONAL_CARD_ID = 'card-a';
/** Longitud máxima del nombre: cabe en una línea de la pantalla de 20 caracteres junto al pictograma. */
export const HOLDER_NAME_MAX = 18;

/**
 * Normaliza el nombre que escribe el alumno para su tarjeta ficticia:
 * recorta espacios y admite letras (con tildes), espacios, guion, apóstrofo y punto.
 * Devuelve null si queda vacío o no es válido.
 */
export function normalizeHolderName(raw: string): string | null {
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length === 0 || name.length > HOLDER_NAME_MAX) return null;
  if (!/^[\p{L}][\p{L}\p{M} .'’-]*$/u.test(name)) return null;
  return name;
}
