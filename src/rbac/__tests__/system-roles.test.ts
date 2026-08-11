import { describe, it, expect } from 'vitest'
import { SYSTEM_ROLE_NAMES, ROL_MINIMO, PRECEDENCE, systemRolePermissionKeys, ROLE_DESCRIPTIONS } from '../system-roles'
import { PERMISSION_CATALOG } from '../permissions.catalog'

describe('los roles de Procovar', () => {
  it('son los cinco, escritos como los escribe PEDIDO', () => {
    // Si alguien los renombra aquí, PEDIDO deja de reconocer el rol que recibe
    // y todo el mundo pasa a ser "desconocido". Por eso están clavados.
    expect([...SYSTEM_ROLE_NAMES]).toEqual([
      'SUPER ADMIN', 'ADMINISTRADOR', 'SUPERVISOR', 'GESTOR', 'OPERADOR',
    ])
  })

  it('todos tienen descripción: en la pantalla hay que saber qué es cada uno', () => {
    for (const nombre of SYSTEM_ROLE_NAMES) {
      expect(ROLE_DESCRIPTIONS[nombre]).toBeTruthy()
    }
  })

  it('el Super Admin llega a todo el catálogo', () => {
    const todos = PERMISSION_CATALOG.map((p) => p.key).sort()
    expect(systemRolePermissionKeys('SUPER ADMIN').sort()).toEqual(todos)
  })

  it('el Administrador manda en su sucursal, pero no en toda Procovar', () => {
    const admin = systemRolePermissionKeys('ADMINISTRADOR')
    expect(admin).toContain('member.invite')
    expect(admin).toContain('member.assignRole')
    expect(admin).toContain('reporte.read')
    // Registrar aplicaciones y borrar roles del catálogo afectan a las ocho
    // sucursales a la vez: eso es del Super Admin.
    expect(admin).not.toContain('app.manage')
    expect(admin).not.toContain('role.delete')
  })

  it('el Supervisor trabaja la sucursal pero no reparte accesos', () => {
    const sup = systemRolePermissionKeys('SUPERVISOR')
    expect(sup).toContain('vendedor.manage')
    expect(sup).toContain('pedido.import')
    expect(sup).toContain('reporte.read')
    expect(sup).toContain('member.read')
    expect(sup).not.toContain('member.assignRole')
    expect(sup).not.toContain('member.invite')
  })

  it('el Operador factura: ni sube CSV ni saca informes de PEDIDO', () => {
    const op = systemRolePermissionKeys('OPERADOR')
    expect(op).toContain('pedido.read')
    expect(op).toContain('pedido.complete')
    // Así funciona hoy en PEDIDO, y romperlo aquí lo rompe allí.
    expect(op).not.toContain('pedido.import')
    expect(op).not.toContain('reporte.read')
    // Pero sí la analítica: "el facturador analítico", dijo Jose.
    expect(op).toContain('analitics.read')
  })

  it('el Gestor solo lee, y ni siquiera puede completar un pedido', () => {
    const gestor = systemRolePermissionKeys('GESTOR')
    expect(gestor).toContain('pedido.read')
    expect(gestor).not.toContain('pedido.complete')
    expect(gestor).not.toContain('vendedor.manage')
  })

  it('cada rol da al menos lo que da el de debajo', () => {
    // Un Supervisor que no pudiera hacer algo que sí puede un Operador sería un
    // sinsentido que además nadie notaría hasta que alguien se queja.
    const orden = ['GESTOR', 'OPERADOR', 'SUPERVISOR', 'ADMINISTRADOR', 'SUPER ADMIN']
    for (let i = 1; i < orden.length; i++) {
      const menor = systemRolePermissionKeys(orden[i - 1])
      const mayor = new Set(systemRolePermissionKeys(orden[i]))
      for (const k of menor) {
        expect(mayor.has(k), `${orden[i]} debería incluir ${k} (lo tiene ${orden[i - 1]})`).toBe(true)
      }
    }
  })

  it('ningún rol da un permiso que no exista', () => {
    const catalogo = new Set(PERMISSION_CATALOG.map((p) => p.key))
    for (const nombre of SYSTEM_ROLE_NAMES) {
      for (const k of systemRolePermissionKeys(nombre)) {
        expect(catalogo.has(k), `${nombre} da "${k}", que no está en el catálogo`).toBe(true)
      }
    }
  })

  it('un rol desconocido no da nada', () => {
    expect(systemRolePermissionKeys('lo-que-sea')).toEqual([])
  })

  it('el rol por defecto es el más limitado', () => {
    expect(ROL_MINIMO).toBe('GESTOR')
    expect(PRECEDENCE[0]).toBe('SUPER ADMIN')
  })
})
