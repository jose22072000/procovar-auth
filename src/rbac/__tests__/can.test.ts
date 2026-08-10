import { describe, it, expect } from 'vitest'
import { can } from '../can'
import type { ResolvedRbac } from '../types'

const base: ResolvedRbac = {
  org: 'o1', wildcard: false,
  global: ['property.read'],
  byProperty: { p1: ['property.edit'] },
}

describe('can', () => {
  it('denies when rbac missing', () => {
    expect(can(null, 'property.read')).toBe(false)
    expect(can(undefined, 'property.read')).toBe(false)
  })
  it('wildcard allows everything', () => {
    expect(can({ ...base, wildcard: true }, 'anything.at.all', 'pX')).toBe(true)
  })
  it('global permission applies to any property', () => {
    expect(can(base, 'property.read')).toBe(true)
    expect(can(base, 'property.read', 'p1')).toBe(true)
    expect(can(base, 'property.read', 'pZ')).toBe(true)
  })
  it('byProperty permission only for that property', () => {
    expect(can(base, 'property.edit', 'p1')).toBe(true)
    expect(can(base, 'property.edit', 'p2')).toBe(false)
  })
  it('byProperty permission without propertyId is denied', () => {
    expect(can(base, 'property.edit')).toBe(false)
  })
  it('unknown permission denied', () => {
    expect(can(base, 'role.delete')).toBe(false)
  })
})
