# Página de Booking

## Descripción

La página de booking (`/app/booking/page.tsx`) permite a los usuarios completar una reserva de hotel similar a Booking.com. Esta página maneja el checkout completo incluyendo la recolección de datos del usuario, creación de cuenta opcional, y pago a través de Redsys.

## Parámetros de URL Requeridos

La página requiere los siguientes parámetros en la URL:

```
/booking?propertyId=123&roomTypeId=456&guests=2&checkin=2026-02-15&checkout=2026-02-20
```

- **propertyId**: ID de la propiedad/hotel
- **roomTypeId**: ID del tipo de habitación
- **guests**: Número de huéspedes
- **checkin**: Fecha de check-in (formato: YYYY-MM-DD)
- **checkout**: Fecha de check-out (formato: YYYY-MM-DD)

## Variables de Entorno

### Requeridas

Añade esta variable a tu archivo `.env`:

```env
NEXT_PUBLIC_BACKEND_URL="https://qb-back.hostravel.com/api"
```

## Flujo de Funcionamiento

### 1. Obtención de Detalles de la Reserva

Cuando la página carga, hace una petición GET al backend:

```
GET /bookings/details?propertyId=123&roomTypeId=456&checkin=2026-02-15&checkout=2026-02-20&guests=2
```

**Respuesta esperada:**

```json
{
  "property": {
    "id": "123",
    "name": "Hotel Example",
    "address": "Calle Principal 123, Madrid",
    "image": "https://example.com/image.jpg"
  },
  "roomType": {
    "id": "456",
    "name": "Habitación Deluxe",
    "description": "Habitación con vista al mar",
    "pricePerNight": 120.00
  },
  "checkIn": "2026-02-15",
  "checkOut": "2026-02-20",
  "guests": 2,
  "nights": 5,
  "totalPrice": 660.00
}
```

### 2. Verificación de Autenticación

La página verifica si el usuario está autenticado usando Better Auth:

- **Usuario autenticado**: Se pre-rellenan automáticamente los campos (nombre, apellido, email)
- **Usuario no autenticado**: Se muestran campos vacíos y la opción de crear cuenta

### 3. Recolección de Datos

El formulario recolecta:

- Nombre y apellido
- Email
- Teléfono (con código de país)
- Peticiones especiales (opcional)
- Contraseña (solo si el usuario quiere crear cuenta)

### 4. Creación de Usuario (Opcional)

Si el usuario no está autenticado y marca "Create account", se crea una cuenta usando Better Auth:

```typescript
const signUpResult = await authClient.signUp.email({
  email: formData.email,
  password: formData.password,
  name: `${formData.firstName} ${formData.lastName}`,
});
```

### 5. Creación de la Orden

Se envía una petición POST al backend para crear la orden:

```
POST /bookings/create-order
```

**Body:**

```json
{
  "propertyId": "123",
  "roomTypeId": "456",
  "checkIn": "2026-02-15",
  "checkOut": "2026-02-20",
  "guests": 2,
  "customer": {
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "phone": "+34612345678"
  },
  "specialRequests": "Habitación en piso alto por favor"
}
```

**Respuesta esperada:**

```json
{
  "orderId": "ORD-123456",
  "redsysUrl": "https://sis.redsys.es/sis/realizarPago",
  "redsysParams": {
    "Ds_SignatureVersion": "HMAC_SHA256_V1",
    "Ds_MerchantParameters": "eyJEc19NZXJjaGFudF9BbW91bnQiOiI2NjAwMCIsIkRzX01lcmNoYW50X09yZGVyIjoiT1JELTE...",
    "Ds_Signature": "abc123..."
  }
}
```

### 6. Redirección a Redsys

La página crea un formulario HTML oculto con los parámetros de Redsys y lo envía automáticamente:

```html
<form method="POST" action="https://sis.redsys.es/sis/realizarPago">
  <input type="hidden" name="Ds_SignatureVersion" value="HMAC_SHA256_V1" />
  <input type="hidden" name="Ds_MerchantParameters" value="eyJEc19NZXJjaGFudF..." />
  <input type="hidden" name="Ds_Signature" value="abc123..." />
</form>
```

El formulario se envía automáticamente, redirigiendo al usuario a la página de pago de Redsys.

## API Backend Requerida

El backend debe implementar estos endpoints:

### 1. GET `/bookings/details`

Devuelve los detalles de la reserva incluyendo información del hotel, habitación, y cálculo de precio.

### 2. POST `/bookings/create-order`

Crea la orden de reserva y genera los parámetros firmados para Redsys.

**Debe incluir:**
- Creación del registro de reserva en base de datos
- Generación de los parámetros de Redsys (MerchantParameters, Signature)
- Configuración de URLs de callback (OK, KO)

## Características

✅ **Detección automática de autenticación**: Usa Better Auth para detectar usuarios logueados
✅ **Pre-llenado de formularios**: Si el usuario está autenticado, sus datos se rellenan automáticamente
✅ **Creación de cuenta opcional**: Los usuarios no autenticados pueden crear cuenta durante el checkout
✅ **Diseño responsive**: Funciona en móviles, tablets y escritorio
✅ **Integración con Redsys**: Redirección automática al TPV virtual de Redsys
✅ **Resumen de precio en tiempo real**: Muestra el desglose de precio, impuestos y total
✅ **Validación de formularios**: Campos requeridos y validación de email

## Mejoras Futuras

- [ ] Validación de disponibilidad de habitación antes de procesar
- [ ] Soporte para múltiples métodos de pago
- [ ] Guardado de reservas como borrador
- [ ] Aplicación de cupones de descuento
- [ ] Soporte para múltiples habitaciones en una reserva
- [ ] Selección de extras (desayuno, parking, etc.)

## Testing

Para probar la página en desarrollo:

```bash
# Ejemplo de URL de prueba
http://localhost:3500/booking?propertyId=1&roomTypeId=5&guests=2&checkin=2026-03-15&checkout=2026-03-20
```

Asegúrate de que:
1. El backend esté corriendo y accesible
2. La variable `NEXT_PUBLIC_BACKEND_URL` esté configurada
3. El endpoint `/bookings/details` devuelva datos válidos
4. El endpoint `/bookings/create-order` esté configurado correctamente

## Seguridad

- Las cookies de sesión se envían con `credentials: "include"`
- Los datos sensibles se manejan solo en el backend
- La firma de Redsys se genera en el backend (nunca en el frontend)
- Las contraseñas se procesan a través de Better Auth con hashing seguro
