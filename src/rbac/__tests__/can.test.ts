import { describe, it, expect } from 'vitest'
import { can } from '../can'
import type { ResolvedRbac } from '../types'

const operadora: ResolvedRbac = {
  org: 'holguin', wildcard: false,
  global: ['pedido.read', 'pedido.complete'],
}

describe('can', () => {
  it('sin nada resuelto, no se puede nada', () => {
    // Que un fallo al resolver acabe en "adelante" es como se regalan accesos.
    expect(can(null, 'pedido.read')).toBe(false)
    expect(can(undefined, 'pedido.read')).toBe(false)
  })

  it('el Super Admin puede todo', () => {
    expect(can({ ...operadora, wildcard: true }, 'lo.que.sea')).toBe(true)
  })

  it('lo que se tiene, se puede', () => {
    expect(can(operadora, 'pedido.complete')).toBe(true)
  })

  it('lo que no se tiene, no', () => {
    expect(can(operadora, 'pedido.import')).toBe(false)
    expect(can(operadora, 'role.delete')).toBe(false)
  })
})
