import { describe, it, expect } from 'vitest'
import { PERMISSION_CATALOG } from '../permissions.catalog'

describe('PERMISSION_CATALOG', () => {
  it('has unique keys', () => {
    const keys = PERMISSION_CATALOG.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('has reservation.read only (lifecycle actions are not permissions)', () => {
    const keys = PERMISSION_CATALOG.map((p) => p.key)
    expect(keys).toContain('reservation.read')
    // guests create reservations in QBT; cancel/modify/check-in/out are done by
    // anyone in the org — none of these are gated permissions.
    for (const k of ['reservation.create', 'reservation.cancel', 'reservation.modify', 'reservation.checkin', 'reservation.checkout']) {
      expect(keys).not.toContain(k)
    }
  })
  it('includes core management permissions', () => {
    const keys = PERMISSION_CATALOG.map((p) => p.key)
    for (const k of ['property.edit', 'media.upload', 'role.create', 'member.invite']) {
      expect(keys).toContain(k)
    }
  })
  it('every entry has es+en labels and a group', () => {
    for (const p of PERMISSION_CATALOG) {
      expect(p.label.es).toBeTruthy()
      expect(p.label.en).toBeTruthy()
      expect(p.group).toBeTruthy()
    }
  })
})
