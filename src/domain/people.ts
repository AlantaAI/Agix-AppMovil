import type { Person } from '@/data/types';

/** «Tyrone Sotil» → «TS»; «diego» → «DI»; un correo usa su parte local. */
export function initials(name: string): string {
  const clean = name.split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!clean) return '?';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Nombre visible: apodo, nombre o correo, en ese orden. */
export function displayName(person: Person | undefined, fallback = 'Sin nombre'): string {
  if (!person) return fallback;
  return person.nickname || person.name || person.email || fallback;
}

/** Primer nombre, para saludar. */
export function firstName(person: Person | undefined): string {
  const name = displayName(person, '');
  if (!name || name.includes('@')) return '';
  return name.split(/\s+/)[0];
}

/** Color estable por persona, para los avatares. */
const AVATAR_COLORS = ['#c9186a', '#1b3bd6', '#0f7f5e', '#8f6100', '#7a3fd1', '#c2410c'];

export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
