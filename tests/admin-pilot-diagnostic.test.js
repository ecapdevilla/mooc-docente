const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

const { pool } = require('../src/config/database');
const app = require('../src/server');

const BASE = '/api/v1/admin/pilot-diagnostic';
const VERSION_ID = 'eeb7b88c-1d3c-4a2d-8a15-4f4a98261111';
const QUESTION_ID = 'dab5fdf0-20a1-4e51-9bf7-d4034f001111';
const SOURCE_QUESTION_ID = 'PILOT-Q-001';
const EXAM_CODE = 'MD-DIA-2026-PILOTO-001';
const MIGRATION_PATH = path.join(__dirname, '..', 'database', 'migrations', '20261031_pilot_editorial_drafts.sql');

const accessToken = (id = 12) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'admin-pilot-tests-secret', { expiresIn: '5m' });

const questionSnapshot = (status = 'borrador') => ({
  id: QUESTION_ID,
  version_id: VERSION_ID,
  source_question_id: SOURCE_QUESTION_ID,
  orden: 1,
  categoria: 'Pedagogía',
  evidencia: 'Analiza una situación de aula.',
  enunciado: 'Una situación de prueba plantea una decisión pedagógica.',
  clave: 'A',
  justificacion: 'La decisión considera las evidencias del aprendizaje.',
  codigo: 'MD-DIA-2026-PILOTO-001',
  version: 'borrador-academico-1',
  estado: status,
});

const sourceQuestion = () => ({
  id: SOURCE_QUESTION_ID,
  orden: 1,
  categoria: 'Pedagogía',
  evidencia: 'Analiza una situación de aula.',
  enunciado: 'Una situación de prueba plantea una decisión pedagógica.',
  clave: 'A',
  justificacion: 'La decisión considera las evidencias del aprendizaje.',
  option_count: 4,
  distinct_option_count: 4,
  key_exists: true,
  options_complete: true,
  options_unique: true,
  option_codes_valid: true,
});

const sourceOptions = () =>
  ['A', 'B', 'C', 'D'].map((codigo) => ({
    codigo,
    texto: `Alternativa original ${codigo}`,
    retroalimentacion: `Retroalimentación ${codigo}`,
  }));

const draftPayload = () => ({
  orden: 1,
  categoria: 'Pedagogía',
  evidencia: 'Analiza una situación de aula.',
  enunciado: 'Una situación de prueba plantea una decisión pedagógica revisada.',
  clave: 'B',
  justificacion: 'La respuesta integra el contexto y la evidencia del aprendizaje.',
  opciones: ['A', 'B', 'C', 'D'].map((codigo) => ({
    codigo,
    texto: `Alternativa actualizada ${codigo}`,
    retroalimentacion: `Explicación para la alternativa ${codigo}`,
  })),
});

const newQuestionPayload = () => ({
  ...draftPayload(),
  orden: 51,
  enunciado: 'Una situación nueva de prueba plantea una decisión pedagógica.',
});

let client;

beforeEach(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'admin-pilot-tests-secret';
  jest.clearAllMocks();
  pool.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes('SELECT id, nombre, email, rol, activo FROM users')) {
      return {
        rows: [{
          id: params[0],
          nombre: 'Admin de prueba',
          email: 'admin@example.test',
          rol: params[0] === 13 ? 'estudiante' : 'admin',
          activo: true,
        }],
      };
    }
    return { rows: [] };
  });
  client = { query: jest.fn(), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});

describe('API editorial del diagnóstico piloto', () => {
  test('deniega la consulta sin sesión', async () => {
    const response = await request(app).get(`${BASE}/exams`);
    expect(response.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('deniega escrituras sin sesión y a estudiantes antes de abrir una transacción', async () => {
    const unauthenticated = await request(app)
      .post(`${BASE}/versions/${VERSION_ID}/questions`)
      .send(newQuestionPayload());
    const student = await request(app)
      .post(`${BASE}/versions/${VERSION_ID}/questions`)
      .set('Authorization', `Bearer ${accessToken(13)}`)
      .send(newQuestionPayload());

    expect(unauthenticated.status).toBe(401);
    expect(student.status).toBe(403);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('deniega a estudiantes aunque tengan JWT válido', async () => {
    const response = await request(app)
      .get(`${BASE}/exams`)
      .set('Authorization', `Bearer ${accessToken(13)}`);
    expect(response.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('permite a un administrador listar exámenes y categorías actuales', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, nombre, email, rol, activo FROM users')) {
        return { rows: [{ id: 12, nombre: 'Admin', rol: 'admin', activo: true }] };
      }
      if (sql.includes('FROM md_pilot_exams e')) {
        return {
          rows: [{
            codigo: 'MD-DIA-2026-PILOTO-001',
            titulo: 'Diagnóstico piloto',
            version: '1',
            estado: 'publicado',
            duracion_min: 85,
            total_preguntas: 50,
            categorias: ['Pedagogía'],
          }],
        };
      }
      return { rows: [] };
    });

    const response = await request(app)
      .get(`${BASE}/exams`)
      .set('Authorization', `Bearer ${accessToken()}`);
    expect(response.status).toBe(200);
    expect(response.body.exams[0].total_preguntas).toBe(50);
    expect(response.body.exams[0].categorias).toEqual(['Pedagogía']);
  });

  test('crea y copia un borrador editorial sin escribir en tablas activas ni intentos', async () => {
    const sourceQuestions = Array.from({ length: 50 }, (_, index) => ({
      ...sourceQuestion(),
      id: `PILOT-Q-${String(index + 1).padStart(3, '0')}`,
      orden: index + 1,
    }));
    client.query.mockImplementation(async (sql, params = []) => {
      if (sql.includes('SELECT codigo, version') && sql.includes('md_pilot_exams')) {
        return { rows: [{ codigo: 'MD-DIA-2026-PILOTO-001', version: '1' }] };
      }
      if (sql.includes('FROM md_pilot_questions q') && sql.includes('option_count')) {
        return { rows: sourceQuestions };
      }
      if (sql.includes('INSERT INTO md_pilot_editorial_versions')) {
        return {
          rows: [{
            id: VERSION_ID,
            codigo: 'MD-DIA-2026-PILOTO-001',
            version: 'borrador-academico-1',
            source_version: '1',
            estado: 'borrador',
            creado_por: 12,
            creado_en: '2026-10-31T12:00:00Z',
          }],
        };
      }
      return { rows: [], rowCount: 1 };
    });

    const response = await request(app)
      .post(`${BASE}/versions`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ codigo: 'MD-DIA-2026-PILOTO-001', version: 'borrador-academico-1' });

    expect(response.status).toBe(201);
    expect(response.body.version.total_preguntas).toBe(50);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO md_pilot_editorial_questions'),
      expect.any(Array)
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO md_pilot_editorial_options'),
      [VERSION_ID]
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    const statements = client.query.mock.calls.map(([sql]) => sql);
    expect(client.query).toHaveBeenCalledWith('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const activeTableWrite = /\bINSERT\s+INTO\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b|\bUPDATE\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b|\bDELETE\s+FROM\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b/i;
    expect(statements.some((sql) => activeTableWrite.test(sql))).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('rechaza copiar un banco que no tenga exactamente cuatro opciones A-D distintas', async () => {
    const invalidSource = { ...sourceQuestion(), option_codes_valid: false };
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT codigo, version') && sql.includes('md_pilot_exams')) {
        return { rows: [{ codigo: 'MD-DIA-2026-PILOTO-001', version: '1' }] };
      }
      if (sql.includes('FROM md_pilot_questions q') && sql.includes('option_count')) {
        return { rows: [invalidSource] };
      }
      return { rows: [] };
    });

    const response = await request(app)
      .post(`${BASE}/versions`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ codigo: 'MD-DIA-2026-PILOTO-001', version: 'borrador-invalido' });

    expect(response.status).toBe(409);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) =>
      sql.includes('INSERT INTO md_pilot_editorial_versions')
    )).toBe(false);
  });

  test('informa los campos académicos faltantes del origen sin inventarlos ni crear el borrador', async () => {
    const incompleteSource = {
      ...sourceQuestion(),
      evidencia: null,
      justificacion: null,
    };
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT codigo, version') && sql.includes('md_pilot_exams')) {
        return { rows: [{ codigo: EXAM_CODE, version: '1' }] };
      }
      if (sql.includes('FROM md_pilot_questions q') && sql.includes('option_count')) {
        return { rows: [incompleteSource] };
      }
      return { rows: [] };
    });

    const response = await request(app)
      .post(`${BASE}/versions`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ codigo: EXAM_CODE, version: 'borrador-con-faltantes' });

    expect(response.status).toBe(409);
    expect(response.body.preguntas_requieren_revision).toEqual([{
      id: SOURCE_QUESTION_ID,
      orden: 1,
      campos: ['evidencia', 'justificacion'],
    }]);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) =>
      sql.includes('INSERT INTO md_pilot_editorial_versions')
    )).toBe(false);
  });

  test('crea una pregunta nueva sin origen en una transacción con cuatro opciones e historial', async () => {
    const newQuestionId = 'c19b9db2-1c2a-4f4a-9c2a-0b2f6af71111';
    client.query.mockImplementation(async (sql, params = []) => {
      if (sql.includes('FROM md_pilot_editorial_versions') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: VERSION_ID, codigo: EXAM_CODE, estado: 'borrador' }] };
      }
      if (sql.includes('SELECT DISTINCT categoria') && sql.includes('md_pilot_questions')) {
        return { rows: [{ categoria: 'Pedagogía' }] };
      }
      if (sql.includes('INSERT INTO md_pilot_editorial_questions')) {
        expect(params).toEqual([
          VERSION_ID,
          51,
          'Pedagogía',
          'Analiza una situación de aula.',
          'Una situación nueva de prueba plantea una decisión pedagógica.',
          'B',
          'La respuesta integra el contexto y la evidencia del aprendizaje.',
        ]);
        return { rows: [{ id: newQuestionId }] };
      }
      return { rows: [], rowCount: 1 };
    });

    const response = await request(app)
      .post(`${BASE}/versions/${VERSION_ID}/questions`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send(newQuestionPayload());

    expect(response.status).toBe(201);
    expect(response.body.question.source_question_id).toBeNull();
    const statements = client.query.mock.calls.map(([sql]) => sql);
    expect(statements.filter((sql) => sql.includes('INSERT INTO md_pilot_editorial_options'))).toHaveLength(4);
    expect(statements.some((sql) => sql.includes('INSERT INTO md_pilot_editorial_audit'))).toBe(true);
    expect(statements[0]).toBe('BEGIN');
    expect(statements[statements.length - 1]).toBe('COMMIT');
    const activeTableWrite = /\bINSERT\s+INTO\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b|\bUPDATE\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b|\bDELETE\s+FROM\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b/i;
    expect(statements.some((sql) => activeTableWrite.test(sql))).toBe(false);
  });

  test('rechaza preguntas nuevas incompletas sin abrir una transacción', async () => {
    const invalidPayload = newQuestionPayload();
    invalidPayload.opciones[3].texto = invalidPayload.opciones[0].texto;

    const response = await request(app)
      .post(`${BASE}/versions/${VERSION_ID}/questions`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('exige retroalimentación explicativa no vacía para cada alternativa', async () => {
    const invalidPayload = newQuestionPayload();
    invalidPayload.opciones[2].retroalimentacion = 'No.';

    const response = await request(app)
      .post(`${BASE}/versions/${VERSION_ID}/questions`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('retroalimentación');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('marca posibles enunciados duplicados con una alerta orientativa y no devuelve la clave', async () => {
    const prompt = 'En una institución educativa, una docente analiza evidencias diversas de aprendizaje y acuerda con sus estudiantes una estrategia de acompañamiento pedagógico para el siguiente periodo escolar.';
    pool.query.mockImplementation(async (sql, params = []) => {
      if (sql.includes('SELECT id, nombre, email, rol, activo FROM users')) {
        return { rows: [{ id: params[0], nombre: 'Admin', rol: 'admin', activo: true }] };
      }
      if (sql.includes('FROM md_pilot_editorial_questions q')) {
        return {
          rows: [
            { id: QUESTION_ID, orden: 1, categoria: 'Pedagogía', enunciado: prompt, evidencia: 'Evidencias de aprendizaje', estado_version: 'borrador' },
            { id: '00000000-0000-4000-8000-000000000002', orden: 2, categoria: 'Pedagogía', enunciado: prompt.toLocaleUpperCase('es'), evidencia: 'Evidencias de aprendizaje', estado_version: 'borrador' },
          ],
        };
      }
      return { rows: [] };
    });

    const response = await request(app)
      .get(`${BASE}/versions/${VERSION_ID}/questions`)
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(2);
    expect(response.body.questions[0].observaciones_revision).toContain(
      'Posible duplicado exacto de la pregunta 2.'
    );
    expect(response.body.questions.every((question) => !Object.hasOwn(question, 'clave'))).toBe(true);
    const listQuery = pool.query.mock.calls.find(([sql]) => sql.includes('FROM md_pilot_editorial_questions q'));
    expect(listQuery[0]).not.toMatch(/\bclave\b/i);
  });

  test('revierte la creación completa si falla la inserción de una alternativa', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('FROM md_pilot_editorial_versions') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: VERSION_ID, codigo: EXAM_CODE, estado: 'borrador' }] };
      }
      if (sql.includes('SELECT DISTINCT categoria') && sql.includes('md_pilot_questions')) {
        return { rows: [{ categoria: 'Pedagogía' }] };
      }
      if (sql.includes('INSERT INTO md_pilot_editorial_questions')) {
        return { rows: [{ id: QUESTION_ID }] };
      }
      if (sql.includes('INSERT INTO md_pilot_editorial_options')) {
        const error = new Error('simulated option constraint');
        error.code = '23514';
        throw error;
      }
      return { rows: [], rowCount: 1 };
    });

    const response = await request(app)
      .post(`${BASE}/versions/${VERSION_ID}/questions`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send(newQuestionPayload());

    expect(response.status).toBe(409);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('recupera preguntas completas y guarda el cambio con historial en una transacción', async () => {
    let savedQuestion = questionSnapshot();
    let savedOptions = sourceOptions();
    pool.query.mockImplementation(async (sql, params = []) => {
      if (sql.includes('SELECT id, nombre, email, rol, activo FROM users')) {
        return { rows: [{ id: params[0], nombre: 'Admin', rol: 'admin', activo: true }] };
      }
      if (sql.includes('SELECT q.id, q.version_id')) {
        return { rows: [savedQuestion] };
      }
      if (sql.includes('FROM md_pilot_editorial_options')) {
        return { rows: savedOptions };
      }
      return { rows: [] };
    });
    client.query.mockImplementation(async (sql, params = []) => {
      if (sql.includes('DELETE FROM md_pilot_editorial_options')) {
        savedOptions = [];
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('SELECT q.id, q.version_id')) {
        return { rows: [savedQuestion] };
      }
      if (sql.includes('FROM md_pilot_editorial_options')) {
        return { rows: savedOptions };
      }
      if (sql.includes('SELECT DISTINCT categoria') && sql.includes('md_pilot_questions')) {
        return { rows: [{ categoria: 'Pedagogía' }] };
      }
      if (sql.includes('UPDATE md_pilot_editorial_questions')) {
        const [orden, categoria, evidencia, enunciado, clave, justificacion] = params;
        savedQuestion = { ...savedQuestion, orden, categoria, evidencia, enunciado, clave, justificacion };
      }
      if (sql.includes('INSERT INTO md_pilot_editorial_options')) {
        const [, codigo, texto, retroalimentacion] = params;
        savedOptions.push({ codigo, texto, retroalimentacion });
      }
      return { rows: [], rowCount: 1 };
    });

    const response = await request(app)
      .put(`${BASE}/versions/${VERSION_ID}/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send(draftPayload());

    expect(response.status).toBe(200);
    expect(response.body.question.clave).toBe('B');
    expect(response.body.question.opciones).toHaveLength(4);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO md_pilot_editorial_audit'),
      expect.any(Array)
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');

    const getQuestion = await request(app)
      .get(`${BASE}/versions/${VERSION_ID}/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${accessToken()}`);
    expect(getQuestion.status).toBe(200);
    expect(getQuestion.body.question.clave).toBe('B');
    expect(getQuestion.body.question.opciones).toHaveLength(4);
    expect(getQuestion.body.question.opciones[0].texto).toBe('Alternativa actualizada A');
    const writes = client.query.mock.calls.map(([sql]) => sql);
    const activeTableWrite = /\bINSERT\s+INTO\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b|\bUPDATE\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b|\bDELETE\s+FROM\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b/i;
    expect(writes.some((sql) => activeTableWrite.test(sql))).toBe(false);
  });

  test('rechaza opciones incompletas, duplicadas y justificación vacía antes de abrir transacción', async () => {
    const incomplete = draftPayload();
    incomplete.opciones.pop();
    const response = await request(app)
      .put(`${BASE}/versions/${VERSION_ID}/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send(incomplete);
    expect(response.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();

    const duplicate = draftPayload();
    duplicate.opciones[1].texto = duplicate.opciones[0].texto;
    const duplicateResponse = await request(app)
      .put(`${BASE}/versions/${VERSION_ID}/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send(duplicate);
    expect(duplicateResponse.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();

    const noJustification = draftPayload();
    noJustification.justificacion = '   ';
    const noJustificationResponse = await request(app)
      .put(`${BASE}/versions/${VERSION_ID}/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send(noJustification);
    expect(noJustificationResponse.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('rechaza edición de versiones publicadas', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT q.id, q.version_id')) {
        return { rows: [questionSnapshot('publicada')] };
      }
      if (sql.includes('FROM md_pilot_editorial_options')) {
        return { rows: sourceOptions() };
      }
      return { rows: [] };
    });

    const response = await request(app)
      .put(`${BASE}/versions/${VERSION_ID}/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${accessToken()}`)
      .send(draftPayload());
    expect(response.status).toBe(409);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('UPDATE md_pilot_editorial_questions'))).toBe(false);
  });
});

describe('Migración editorial de borradores', () => {
  let migration;

  beforeAll(() => {
    migration = fs.readFileSync(MIGRATION_PATH, 'utf8');
  });

  test('impide reasignar opciones y restringe los estados antes de publicar', () => {
    expect(migration).toMatch(/IF NEW\.question_id IS DISTINCT FROM OLD\.question_id THEN/);
    expect(migration).toMatch(/CHECK \(estado IN \('borrador', 'revision'\)\)/);
    expect(migration).toMatch(/NEW\.estado NOT IN \('borrador', 'revision'\)/);
    expect(migration).toMatch(/source_question_id TEXT REFERENCES md_pilot_questions\(id\)/);
  });

  test('mantiene la auditoría append-only y valida el vínculo de pregunta y versión', () => {
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON md_pilot_editorial_audit/);
    expect(migration).toMatch(/BEFORE TRUNCATE ON md_pilot_editorial_audit/);
    expect(migration).toMatch(/FOREIGN KEY \(question_id, version_id\)[\s\S]*REFERENCES md_pilot_editorial_questions\(id, version_id\)/);
    expect(migration).toMatch(/UNIQUE \(id, version_id\)/);
  });

  test('no altera por DDL las tablas activas ni las de intentos publicadas', () => {
    expect(migration).not.toMatch(/\b(?:ALTER|DROP|TRUNCATE)\s+TABLE\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b/i);
    expect(migration).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\s+INTO?\s+md_pilot_(?:exams|questions|options|attempts|attempt_answers)\b/i);
  });

  test('usa validación diferida para exigir exactamente cuatro opciones al commit', () => {
    expect(migration).toMatch(/CONSTRAINT TRIGGER md_pilot_editorial_question_shape_check[\s\S]*DEFERRABLE INITIALLY DEFERRED/);
    expect(migration).toMatch(/CONSTRAINT TRIGGER md_pilot_editorial_option_shape_check[\s\S]*DEFERRABLE INITIALLY DEFERRED/);
    expect(migration).toMatch(/v_count <> 4 OR v_distinct_count <> 4 OR v_distinct_text_count <> 4/);
  });

  test('aplica RLS forzado y revoca privilegios de tablas y secuencia para roles públicos', () => {
    for (const table of ['versions', 'questions', 'options', 'audit']) {
      expect(migration).toMatch(new RegExp(`ALTER TABLE md_pilot_editorial_${table} FORCE ROW LEVEL SECURITY`));
    }
    expect(migration).toMatch(/REVOKE ALL ON TABLE[\s\S]*FROM PUBLIC/);
    expect(migration).toMatch(/REVOKE ALL ON SEQUENCE %s FROM PUBLIC/);
    expect(migration).toMatch(/REVOKE ALL ON SEQUENCE %s FROM anon/);
    expect(migration).toMatch(/REVOKE ALL ON SEQUENCE %s FROM authenticated/);
  });
});
