/**
 * Pruebas de la clasificación de errores de cuerpo inválido.
 *
 * Motivo: en local `body-parser` marca el JSON malformado con
 * `type = 'entity.parse.failed'`, pero el runtime serverless de Vercel entrega
 * el mismo caso sin `type` (status 400 y `SyntaxError` de otro contexto). Sin
 * esta clasificación, Production responde `400` con el mensaje genérico y no
 * con el contrato documentado.
 */

const { esCuerpoJsonInvalido } = require('../src/utils/httpErrors');

describe('esCuerpoJsonInvalido', () => {
  test('reconoce el error de body-parser local', () => {
    const error = Object.assign(new SyntaxError('Unexpected end of input'), {
      type: 'entity.parse.failed',
      status: 400,
      body: '{"email":"x","password":',
    });

    expect(esCuerpoJsonInvalido(error)).toBe(true);
  });

  test('reconoce el error de Vercel, sin type y con SyntaxError de otro contexto', () => {
    const error = { name: 'SyntaxError', status: 400, message: 'Unexpected token' };

    expect(esCuerpoJsonInvalido(error)).toBe(true);
  });

  test('reconoce el error 400 que solo adjunta el cuerpo', () => {
    const error = { status: 400, message: 'invalid json', body: '{ esto no es json' };

    expect(esCuerpoJsonInvalido(error)).toBe(true);
  });

  test('no confunde un 400 de validación con un cuerpo inválido', () => {
    const error = { status: 400, message: 'El correo es obligatorio' };

    expect(esCuerpoJsonInvalido(error)).toBe(false);
  });

  test('no trata un SyntaxError interno (5xx) como cuerpo inválido', () => {
    const error = Object.assign(new SyntaxError('fallo interno'), { status: 500 });

    expect(esCuerpoJsonInvalido(error)).toBe(false);
  });

  test('tolera valores vacíos', () => {
    expect(esCuerpoJsonInvalido(null)).toBe(false);
    expect(esCuerpoJsonInvalido(undefined)).toBe(false);
    expect(esCuerpoJsonInvalido('texto')).toBe(false);
  });
});
