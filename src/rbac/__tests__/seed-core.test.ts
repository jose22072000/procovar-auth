import { describe, it, expect } from 'vitest'
import { legacyRoleToSystemRole } from '../seed-core'

describe('legacyRoleToSystemRole', () => {
  it('deja los cinco roles como están', () => {
    expect(legacyRoleToSystemRole('SUPER ADMIN')).toBe('SUPER ADMIN')
    expect(legacyRoleToSystemRole('ADMINISTRADOR')).toBe('ADMINISTRADOR')
    expect(legacyRoleToSystemRole('SUPERVISOR')).toBe('SUPERVISOR')
    expect(legacyRoleToSystemRole('GESTOR')).toBe('GESTOR')
    expect(legacyRoleToSystemRole('OPERADOR')).toBe('OPERADOR')
  })

  it('no se pierde por mayúsculas ni espacios', () => {
    expect(legacyRoleToSystemRole('operador')).toBe('OPERADOR')
    expect(legacyRoleToSystemRole('  Supervisor  ')).toBe('SUPERVISOR')
  })

  it('lo que escribe better-auth por su cuenta cae en el rol más limitado', () => {
    // better-auth pone "member" o "owner" al crear una membresía. Caer hacia
    // arriba (a Administrador) convertiría cualquier alta suya en un regalo de
    // acceso que nadie pidió.
    expect(legacyRoleToSystemRole('member')).toBe('GESTOR')
    expect(legacyRoleToSystemRole('owner')).toBe('GESTOR')
  })

  it('lo desconocido y lo vacío, también', () => {
    expect(legacyRoleToSystemRole('lo-que-sea')).toBe('GESTOR')
    expect(legacyRoleToSystemRole('')).toBe('GESTOR')
  })
})
