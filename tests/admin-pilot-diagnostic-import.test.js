const { strToU8, zipSync } = require('fflate');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

const { pool } = require('../src/config/database');
const app = require('../src/server');
const {
  EXAMPLE_MARKER,
  TEMPLATE_HEADERS,
  XLSX_MIME_TYPE,
} = require('../src/services/pilot-editorial-import');

const BASE = '/api/v1/admin/pilot-diagnostic';
const VERSION_ID = 'eeb7b88c-1d3c-4a2d-8a15-4f4a98261111';
const EXAM_CODE = 'MD-DIA-2026-PILOTO-001';
const VERSION_NAME = 'importación de prueba';
const TEST_SECRET = 'admin-pilot-import-tests-secret';

const accessToken = (id = 12) => jwt.sign({ id }, TEST_SECRET, { expiresIn: '5m' });

const validRow = (number, overrides = {}) => ({
  numero: number,
  categoria: 'Pedagogía',
  evidencia: 'Analiza evidencias del aprendizaje para orientar una decisión docente.',
  enunciado: `En una institución educativa, una docente revisa evidencias diversas de sus estudiantes y debe decidir qué estrategia pedagógica implementar durante el siguiente periodo para fortalecer la comprensión del grupo ${number}.`,
  opcion_a: `La docente recoge nuevas evidencias y ajusta la mediación pedagógica para el grupo ${number}.`,
  retroalimentacion_a: 'Esta opción usa evidencia del proceso para orientar una decisión de enseñanza.',
  opcion_b: `La docente repite la misma explicación sin revisar cómo razonaron los estudiantes ${number}.`,
  retroalimentacion_b: 'Sin recoger nuevas evidencias no se identifica qué obstáculo de aprendizaje persiste.',
  opcion_c: `La docente asigna una calificación y avanza sin ofrecer seguimiento al grupo ${number}.`,
  retroalimentacion_c: 'La calificación aislada no ofrece información suficiente para ajustar la enseñanza.',
  opcion_d: `La docente separa a quienes tuvieron dificultades y les asigna ejercicios idénticos ${number}.`,
  retroalimentacion_d: 'Repetir ejercicios sin analizar el razonamiento puede mantener la dificultad inicial.',
  clave_correcta: 'A',
  justificacion: 'La evaluación formativa permite interpretar evidencias, ajustar la mediación y hacer seguimiento a los aprendizajes.',
  fuente_url: 'https://www.mineducacion.gov.co/',
  ...overrides,
});

const makeWorkbook = async (rows, options = {}) => {
  const sharedStrings = [];
  const sharedStringIndexes = new Map();
  const columnName = (columnNumber) => {
    let value = columnNumber;
    let name = '';
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  };
  const cell = (reference, value) => {
    const text = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    if (!options.useSharedStrings) {
      return `<c r="${reference}" t="inlineStr"><is><t>${text}</t></is></c>`;
    }
    let index = sharedStringIndexes.get(text);
    if (index == null) {
      index = sharedStrings.length;
      sharedStringIndexes.set(text, index);
      sharedStrings.push(text);
    }
    return `<c r="${reference}" t="s"><v>${index}</v></c>`;
  };
  const headerValues = [...TEMPLATE_HEADERS];
  if (options.wrongHeaders) headerValues[0] = 'numero_incorrecto';
  const worksheetRows = [
    `<row r="4">${headerValues.map((value, index) => cell(`${columnName(index + 1)}4`, value)).join('')}</row>`,
    `<row r="5">${cell('A5', EXAMPLE_MARKER)}</row>`,
    ...rows.map((row, rowIndex) => {
      const rowNumber = rowIndex + 6;
      const cells = TEMPLATE_HEADERS.map((header, index) => {
        const reference = `${columnName(index + 1)}${rowNumber}`;
        if (options.formulaCell === reference) return `<c r="${reference}"><f>1+1</f><v>2</v></c>`;
        return row[header] === '' || row[header] == null ? '' : cell(reference, row[header]);
      });
      return `<row r="${rowNumber}">${cells.join('')}</row>`;
    }),
  ];
  const extraEntries = options.extraEntries || {};
  const relationshipExtra = options.externalRelationship
    ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>'
    : '';
  const worksheetTarget = options.worksheetTarget || 'worksheets/sheet1.xml';
  const worksheetXml = `${options.doctype ? '<!DOCTYPE worksheet>' : ''}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>${worksheetRows.join('')}</sheetData></worksheet>`;
  const files = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Importación" sheetId="1" r:id="rId1"${options.hiddenSheet ? ' state="hidden"' : ''}/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${worksheetTarget}"/>${relationshipExtra}</Relationships>`,
    'xl/worksheets/sheet1.xml': worksheetXml,
    ...(options.useSharedStrings ? {
      'xl/sharedStrings.xml': `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${sharedStrings.map((value) => `<si><t>${value}</t></si>`).join('')}</sst>`,
    } : {}),
    ...extraEntries,
  };
  return Buffer.from(zipSync(
    Object.fromEntries(Object.entries(files).map(([path, value]) => [path, strToU8(value)])),
    { level: 6 }
  ));
};

const corruptZipEntry = (buffer, targetName) => {
  const corrupted = Buffer.from(buffer);
  const minimumOffset = Math.max(0, corrupted.length - 65557);
  let endOffset = -1;
  for (let offset = corrupted.length - 22; offset >= minimumOffset; offset -= 1) {
    if (corrupted.readUInt32LE(offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  let offset = corrupted.readUInt32LE(endOffset + 16);
  const entryCount = corrupted.readUInt16LE(endOffset + 10);
  for (let index = 0; index < entryCount; index += 1) {
    const nameLength = corrupted.readUInt16LE(offset + 28);
    const extraLength = corrupted.readUInt16LE(offset + 30);
    const commentLength = corrupted.readUInt16LE(offset + 32);
    const name = corrupted.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (name === targetName) {
      const localOffset = corrupted.readUInt32LE(offset + 42);
      const localNameLength = corrupted.readUInt16LE(localOffset + 26);
      const localExtraLength = corrupted.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      corrupted[dataOffset] ^= 0xff;
      return corrupted;
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`ZIP entry ${targetName} not found`);
};

const importHeaders = (token = accessToken()) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': XLSX_MIME_TYPE,
  'X-Upload-Filename': 'preguntas.xlsx',
  'X-Exam-Code': EXAM_CODE,
  'X-Editorial-Version': VERSION_NAME,
});

const uploadPreview = (buffer, token) =>
  request(app)
    .post(`${BASE}/imports/preview`)
    .set(importHeaders(token))
    .send(buffer);

const uploadConfirm = (buffer, confirmationToken, token) =>
  request(app)
    .post(`${BASE}/imports/confirm`)
    .set({ ...importHeaders(token), 'X-Import-Token': confirmationToken })
    .send(buffer);

let client;

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  jest.clearAllMocks();
  pool.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes('SELECT id, nombre, email, rol, activo FROM users')) {
      return {
        rows: [{
          id: params[0],
          nombre: 'Usuario de prueba',
          email: 'user@example.test',
          rol: params[0] === 13 ? 'estudiante' : 'admin',
          activo: true,
        }],
      };
    }
    if (sql.includes('SELECT DISTINCT categoria') && sql.includes('FROM md_pilot_questions')) {
      return { rows: [{ categoria: 'Pedagogía' }] };
    }
    if (sql.includes('FROM md_pilot_editorial_versions')) return { rows: [] };
    if (sql.includes('SELECT id::text, orden, enunciado')) return { rows: [] };
    return { rows: [] };
  });
  client = { query: jest.fn(), release: jest.fn() };
  client.query.mockImplementation(async (sql) => {
    if (sql.includes('SELECT codigo, version') && sql.includes('md_pilot_exams')) {
      return { rows: [{ codigo: EXAM_CODE, version: '1' }] };
    }
    if (sql.includes('SELECT DISTINCT categoria')) return { rows: [{ categoria: 'Pedagogía' }] };
    if (sql.includes('INSERT INTO md_pilot_editorial_versions')) {
      return {
        rows: [{
          id: VERSION_ID,
          codigo: EXAM_CODE,
          version: VERSION_NAME,
          source_version: '1',
          estado: 'borrador',
          creado_por: 12,
          creado_en: '2026-11-01T12:00:00Z',
        }],
      };
    }
    return { rows: [], rowCount: 1 };
  });
  pool.connect.mockResolvedValue(client);
});

describe('Importación XLSX del diagnóstico piloto', () => {
  test('descarga una plantilla XLSX administrativa con encabezados e instrucciones', async () => {
    const response = await request(app)
      .get(`${BASE}/import-template`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain(XLSX_MIME_TYPE);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(Buffer.from(response.body).subarray(0, 2).toString()).toBe('PK');
  });

  test('previsualiza varias preguntas sin persistirlas y emite una confirmación vinculada al archivo', async () => {
    const buffer = await makeWorkbook([validRow(1), validRow(2)]);
    const response = await uploadPreview(buffer);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      preguntas_detectadas: 2,
      preguntas_validas: 2,
      preguntas_con_errores: 0,
      confirmable: true,
    });
    expect(response.body.preguntas).toHaveLength(2);
    expect(response.body.preguntas[0].opciones).toHaveLength(4);
    expect(response.body.preguntas[0].fuente_url).toBe('https://www.mineducacion.gov.co/');
    expect(response.body.confirmation_token).toEqual(expect.any(String));
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('lee datos válidos guardados en la tabla de cadenas compartidas de Excel', async () => {
    const response = await uploadPreview(await makeWorkbook([validRow(1)], { useSharedStrings: true }));

    expect(response.status).toBe(200);
    expect(response.body.preguntas_detectadas).toBe(1);
    expect(response.body.preguntas_validas).toBe(1);
    expect(response.body.preguntas[0].categoria).toBe('Pedagogía');
  });

  test('detecta encabezados incorrectos con la fila correspondiente', async () => {
    const buffer = await makeWorkbook([validRow(1)], { wrongHeaders: true });
    const response = await uploadPreview(buffer);

    expect(response.status).toBe(200);
    expect(response.body.confirmable).toBe(false);
    expect(response.body.errores).toContainEqual(expect.objectContaining({
      fila: 4,
      mensaje: expect.stringContaining('encabezados'),
    }));
  });

  test.each([
    ['clave inválida', { clave_correcta: 'E' }, /clave correcta/],
    ['alternativa faltante', { opcion_d: '' }, /opción D/],
    ['justificación faltante', { justificacion: '' }, /justificación/],
    ['retroalimentación insuficiente', { retroalimentacion_b: 'No.' }, /mínimo 20 caracteres/],
  ])('bloquea filas con %s', async (_label, overrides, expectedMessage) => {
    const buffer = await makeWorkbook([validRow(1, overrides)]);
    const response = await uploadPreview(buffer);

    expect(response.status).toBe(200);
    expect(response.body.confirmable).toBe(false);
    expect(response.body.preguntas_validas).toBe(0);
    expect(response.body.errores.some((error) =>
      error.fila === 6 && expectedMessage.test(error.mensaje)
    )).toBe(true);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('bloquea alternativas duplicadas después de normalizar texto', async () => {
    const row = validRow(1);
    const buffer = await makeWorkbook([{
      ...row,
      opcion_d: row.opcion_c.toLocaleUpperCase('es'),
    }]);
    const response = await uploadPreview(buffer);

    expect(response.body.confirmable).toBe(false);
    expect(response.body.preguntas_validas).toBe(0);
    expect(response.body.errores.some((error) =>
      error.fila === 6 && /textos diferentes/.test(error.mensaje)
    )).toBe(true);
  });

  test('detecta números repetidos como error bloqueante en ambas filas', async () => {
    const buffer = await makeWorkbook([validRow(3), validRow(3)]);
    const response = await uploadPreview(buffer);

    expect(response.body.preguntas_con_errores).toBe(2);
    expect(response.body.preguntas_validas).toBe(0);
    expect(response.body.errores.filter((error) => /número 3 está repetido/.test(error.mensaje))).toHaveLength(2);
    expect(response.body.confirmable).toBe(false);
  });

  test('señala preguntas exactas o similares sin tratarlas como error automático', async () => {
    const repeatedPrompt = validRow(1).enunciado;
    const buffer = await makeWorkbook([
      validRow(1),
      validRow(2, { enunciado: repeatedPrompt }),
    ]);
    const response = await uploadPreview(buffer);

    expect(response.body.confirmable).toBe(true);
    expect(response.body.posibles_duplicados.length).toBeGreaterThan(0);
  });

  test('rechaza extensiones, tipos reales y contenido XLSX no válido', async () => {
    const validBuffer = await makeWorkbook([validRow(1)]);
    const wrongExtension = await request(app)
      .post(`${BASE}/imports/preview`)
      .set({ ...importHeaders(), 'X-Upload-Filename': 'preguntas.xlsm' })
      .send(validBuffer);
    const wrongMime = await request(app)
      .post(`${BASE}/imports/preview`)
      .set({ ...importHeaders(), 'Content-Type': 'application/octet-stream' })
      .send(validBuffer);
    const compressedRequest = await request(app)
      .post(`${BASE}/imports/preview`)
      .set({ ...importHeaders(), 'Content-Encoding': 'gzip' })
      .send(validBuffer);
    const fakeWorkbook = await uploadPreview(Buffer.from('MZ executable content'));

    expect(wrongExtension.status).toBe(415);
    expect(wrongMime.status).toBe(415);
    expect(compressedRequest.status).toBe(415);
    expect(fakeWorkbook.status).toBe(200);
    expect(fakeWorkbook.body.confirmable).toBe(false);
    expect(fakeWorkbook.body.errores[0].mensaje).toMatch(/XLSX válido/);
  });

  test('rechaza archivos que superen 2 MB', async () => {
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1);
    const response = await uploadPreview(oversized);
    expect(response.status).toBe(413);
  });

  test('no acepta fórmulas en la hoja importada', async () => {
    const buffer = await makeWorkbook([validRow(1)], { formulaCell: 'D6' });
    const response = await uploadPreview(buffer);

    expect(response.body.confirmable).toBe(false);
    expect(response.body.preguntas_detectadas).toBe(1);
    expect(response.body.preguntas_con_errores).toBe(1);
    expect(response.body.errores.some((error) => /fórmulas/.test(error.mensaje))).toBe(true);
  });

  test.each([
    ['rutas ZIP fuera de la carpeta', { extraEntries: { '../payload.xml': 'contenido' } }, /potencialmente inseguras/],
    ['rutas de relación fuera del libro', { worksheetTarget: '../../outside.xml' }, /ruta no admitida/],
    ['macros', { extraEntries: { 'xl/vbaProject.bin': 'macro' } }, /macros/],
    ['relaciones externas', { externalRelationship: true }, /vínculos externos/],
    ['declaraciones DTD', { doctype: true }, /DTD/],
    ['hojas ocultas', { hiddenSheet: true }, /una única hoja visible/],
  ])('rechaza archivos con %s', async (_label, options, expectedError) => {
    const response = await uploadPreview(await makeWorkbook([validRow(1)], options));

    expect(response.body.confirmable).toBe(false);
    expect(response.body.errores.some((error) => expectedError.test(error.mensaje))).toBe(true);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('rechaza archivos con CRC o datos ZIP alterados', async () => {
    const valid = await makeWorkbook([validRow(1)]);
    const response = await uploadPreview(corruptZipEntry(valid, 'xl/worksheets/sheet1.xml'));

    expect(response.body.confirmable).toBe(false);
    expect(response.body.errores[0].mensaje).toMatch(/inválida|dañado/);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('rechaza contenido descomprimido con ratio de compresión peligroso', async () => {
    const oversizedXml = 'x'.repeat(10 * 1024 * 1024 + 1);
    const buffer = await makeWorkbook([validRow(1)], {
      extraEntries: { 'xl/unused.xml': oversizedXml },
    });
    const response = await uploadPreview(buffer);

    expect(buffer.length).toBeLessThan(2 * 1024 * 1024);
    expect(response.body.confirmable).toBe(false);
    expect(response.body.errores[0].mensaje).toMatch(/potencialmente inseguras|descomprimido/);
  });

  test('deniega a estudiantes y a solicitudes sin sesión antes de procesar el archivo', async () => {
    const buffer = await makeWorkbook([validRow(1)]);
    const student = await uploadPreview(buffer, accessToken(13));
    const anonymous = await request(app)
      .post(`${BASE}/imports/preview`)
      .set({
        'Content-Type': XLSX_MIME_TYPE,
        'X-Upload-Filename': 'preguntas.xlsx',
        'X-Exam-Code': EXAM_CODE,
        'X-Editorial-Version': VERSION_NAME,
      })
      .send(buffer);

    expect(student.status).toBe(403);
    expect(anonymous.status).toBe(401);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('confirma una nueva versión en una transacción y no escribe en el examen ni sus resultados', async () => {
    const buffer = await makeWorkbook([validRow(1), validRow(2)]);
    const preview = await uploadPreview(buffer);
    const response = await uploadConfirm(buffer, preview.body.confirmation_token);

    expect(response.status).toBe(201);
    expect(response.body.version).toMatchObject({
      id: VERSION_ID,
      version: VERSION_NAME,
      estado: 'borrador',
      total_preguntas: 2,
    });
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    const statements = client.query.mock.calls.map(([sql]) => sql);
    expect(statements.some((sql) => /INSERT INTO md_pilot_editorial_questions/i.test(sql))).toBe(true);
    expect(statements.some((sql) => /INSERT INTO md_pilot_editorial_options/i.test(sql))).toBe(true);
    expect(statements.filter((sql) => /INSERT INTO md_pilot_editorial_audit/i.test(sql))).toHaveLength(2);
    const activeWrites = /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b/i;
    expect(statements.some((sql) => activeWrites.test(sql))).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('rechaza replay o una modificación del archivo después de la vista previa', async () => {
    const original = await makeWorkbook([validRow(1)]);
    const changed = await makeWorkbook([validRow(1, { evidencia: 'Evidencia modificada después de la previsualización.' })]);
    const preview = await uploadPreview(original);
    const response = await uploadConfirm(changed, preview.body.confirmation_token);

    expect(response.status).toBe(409);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('revierte por completo si una inserción falla durante la persistencia', async () => {
    const buffer = await makeWorkbook([validRow(1)]);
    const preview = await uploadPreview(buffer);
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT codigo, version') && sql.includes('md_pilot_exams')) {
        return { rows: [{ codigo: EXAM_CODE, version: '1' }] };
      }
      if (sql.includes('SELECT DISTINCT categoria')) return { rows: [{ categoria: 'Pedagogía' }] };
      if (sql.includes('INSERT INTO md_pilot_editorial_versions')) {
        return { rows: [{ id: VERSION_ID, codigo: EXAM_CODE, version: VERSION_NAME, estado: 'borrador' }] };
      }
      if (sql.includes('INSERT INTO md_pilot_editorial_options')) {
        throw Object.assign(new Error('simulated insert failure'), { code: 'XX000' });
      }
      return { rows: [], rowCount: 1 };
    });

    const response = await uploadConfirm(buffer, preview.body.confirmation_token);

    expect(response.status).toBe(500);
    const statements = client.query.mock.calls.map(([sql]) => sql);
    expect(statements).toContain('ROLLBACK');
    expect(statements).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
