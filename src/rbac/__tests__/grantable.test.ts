import { describe, it, expect } from 'vitest'
import { ungrantablePermissionKeys } from '../grantable'
import type { ResolvedRbac } from '../types'

// Actor holding only finance.read org-wide, no wildcard.
const financeReader: ResolvedRbac = {
    org: 'o1',
    wildcard: false,
    global: ['finance.read'],
}

describe('ungrantablePermissionKeys (privilege-escalation guard)', () => {
    it('CATCHES the escalation: an actor cannot grant a key it does not hold', () => {
        expect(
            ungrantablePermissionKeys(financeReader, ['finance.read', 'role.delete']),
        ).toEqual(['role.delete'])
    })

    it('wildcard actor (system admin) may grant anything → nothing ungrantable', () => {
        const admin: ResolvedRbac = { ...financeReader, wildcard: true, global: [] }
        expect(ungrantablePermissionKeys(admin, ['finance.read', 'role.delete'])).toEqual([])
    })

    it('missing rbac (no resolved actor) denies everything by default', () => {
        expect(ungrantablePermissionKeys(null, ['finance.read', 'role.delete'])).toEqual([
            'finance.read',
            'role.delete',
        ])
        expect(ungrantablePermissionKeys(undefined, ['a', 'b'])).toEqual(['a', 'b'])
    })

    it('owner-style actor holding every requested key org-wide → nothing ungrantable', () => {
        const owner: ResolvedRbac = {
            org: 'o1',
            wildcard: false,
            global: ['finance.read', 'role.delete', 'role.create'],
        }
        expect(ungrantablePermissionKeys(owner, ['finance.read', 'role.delete'])).toEqual([])
    })

    it('per-property holdings are NOT grantable (only rbac.global counts)', () => {
        const perProp: ResolvedRbac = {
            org: 'o1',
            wildcard: false,
            global: [],
        }
        expect(ungrantablePermissionKeys(perProp, ['role.delete'])).toEqual(['role.delete'])
    })

    it('dedups the requested keys in its returned deny set', () => {
        expect(
            ungrantablePermissionKeys(financeReader, ['role.delete', 'role.delete']),
        ).toEqual(['role.delete'])
    })
})
