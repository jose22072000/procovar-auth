import { describe, it, expect } from 'vitest'
import { aplicacionDeSesion, aparatoDeSesion, desdeDonde } from '../desde-donde'

describe('aplicacionDeSesion', () => {
  it('traduce la clave al nombre que se ve en pantalla', () => {
    expect(aplicacionDeSesion('pedido')).toBe('PEDIDO')
    expect(aplicacionDeSesion('ccsa')).toBe('Tablero Parranda')
  })

  it('sin aplicación, dice que entró aquí', () => {
    // Antes ponía "Directo", que no dice nada: no es un sitio ni una aplicación.
    expect(aplicacionDeSesion(null)).toBe('Entró aquí, en Cuentas')
    expect(aplicacionDeSesion('')).toBe('Entró aquí, en Cuentas')
  })

  it('una aplicación que no conozca se enseña tal cual, no se esconde', () => {
    expect(aplicacionDeSesion('inventada')).toBe('inventada')
  })
})

describe('aparatoDeSesion', () => {
  it('Chrome en Windows', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    expect(aparatoDeSesion(ua)).toBe('Chrome en Windows')
  })

  it('no confunde Edge con Chrome', () => {
    // Edge dice "Chrome" y "Safari" en su cadena. Si se comprueban en mal
    // orden, todos los Edge del mundo salen como Chrome.
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
    expect(aparatoDeSesion(ua)).toBe('Edge en Windows')
  })

  it('no confunde Chrome con Safari', () => {
    const safari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    expect(aparatoDeSesion(safari)).toBe('Safari en Mac')
  })

  it('el teléfono se distingue del ordenador', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    expect(aparatoDeSesion(iphone)).toBe('Safari en iPhone')
    const android = 'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    expect(aparatoDeSesion(android)).toBe('Chrome en Android')
  })

  it('sin agente no se inventa nada', () => {
    // Un "Desconocido" en la celda parece un dato y no lo es.
    expect(aparatoDeSesion(null)).toBeNull()
    expect(aparatoDeSesion('')).toBeNull()
    expect(aparatoDeSesion('   ')).toBeNull()
  })
})

describe('desdeDonde', () => {
  it('la IP vacía cuenta como que no hay IP', () => {
    // El fallo que teníamos: se guardaba cadena vacía, no null, así que la
    // columna parecía tener dato y estaba en blanco.
    expect(desdeDonde('', null)).toEqual({ ip: null, aparato: null })
    expect(desdeDonde('   ', null)).toEqual({ ip: null, aparato: null })
  })

  it('junta sitio y aparato', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
    expect(desdeDonde('186.32.4.10', ua)).toEqual({
      ip: '186.32.4.10',
      aparato: 'Chrome en Windows',
    })
  })
})
