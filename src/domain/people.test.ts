import { describe, expect, it } from 'vitest';
import type { Person } from '@/data/types';
import { avatarColor, displayName, firstName, initials } from './people';

const person = (over: Partial<Person>): Person => ({ id: 'u', name: '', email: '', nickname: '', phone: '', avatarUrl: '', ...over });

describe('personas', () => {
  it('iniciales de nombre, palabra suelta o correo', () => {
    expect(initials('Valeria Ríos')).toBe('VR');
    expect(initials('diego')).toBe('DI');
    expect(initials('ana.torres@agix.app')).toBe('AT');
    expect(initials('  ')).toBe('?');
  });
  it('nombre visible: apodo, nombre o correo', () => {
    expect(displayName(person({ nickname: 'Vale', name: 'Valeria' }))).toBe('Vale');
    expect(displayName(person({ email: 'x@y.z' }))).toBe('x@y.z');
    expect(displayName(undefined, '?')).toBe('?');
  });
  it('primer nombre para saludar, nunca un correo', () => {
    expect(firstName(person({ name: 'Valeria Ríos' }))).toBe('Valeria');
    expect(firstName(person({ email: 'x@y.z' }))).toBe('');
  });
  it('el color del avatar es estable', () => {
    expect(avatarColor('abc')).toBe(avatarColor('abc'));
  });
});
