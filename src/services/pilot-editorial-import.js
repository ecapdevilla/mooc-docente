'use strict';

const { strToU8, zipSync } = require('fflate');
const { SaxesParser } = require('saxes');
const zlib = require('node:zlib');

const OPTION_CODES = ['A', 'B', 'C', 'D'];
const TEMPLATE_HEADERS = [
  'numero',
  'categoria',
  'evidencia',
  'enunciado',
  'opcion_a',
  'retroalimentacion_a',
  'opcion_b',
  'retroalimentacion_b',
  'opcion_c',
  'retroalimentacion_c',
  'opcion_d',
  'retroalimentacion_d',
  'clave_correcta',
  'justificacion',
  'fuente_url',
];
const EXAMPLE_MARKER = 'EJEMPLO_NO_IMPORTAR';
const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_QUESTIONS_PER_FILE = 200;
const MAX_UNCOMPRESSED_BYTES = 10 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 100;
const MAX_WORKSHEET_ROWS = 205;
const MAX_SHARED_STRINGS = 5000;
const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return crc >>> 0;
});

const calculateCrc32 = (data) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const cleanString = (value, maxLength) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength
    ? value.trim()
    : null;

const normalizeForReview = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const reviewTokens = (value) => new Set(
  normalizeForReview(value)
    .split(' ')
    .filter((token) => token.length > 2)
);

const jaccardSimilarity = (left, right) => {
  const leftTokens = reviewTokens(left);
  const rightTokens = reviewTokens(right);
  if (leftTokens.size < 5 || rightTokens.size < 5) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / (leftTokens.size + rightTokens.size - intersection);
};

const questionReviewNotes = (question, otherQuestions = []) => {
  const notes = [];
  const prompt = typeof question.enunciado === 'string' ? question.enunciado.trim() : '';
  const scenarioCue = /\b(docente|estudiante|aula|instituci[oó]n|caso|situaci[oó]n|familia|grupo|curso|aprendizaje|comunidad)\b/i;
  if (prompt.length < 120) {
    notes.push('Enunciado breve: revisar si presenta contexto, reto y decisión pedagógica suficientes.');
  } else if (!scenarioCue.test(prompt)) {
    notes.push('No se detecta un contexto situacional explícito; confirmar que el caso sea realista.');
  }

  const normalizedPrompt = normalizeForReview(prompt);
  for (const other of otherQuestions) {
    if (other.id === question.id) continue;
    const otherPrompt = normalizeForReview(other.enunciado || '');
    if (normalizedPrompt && normalizedPrompt === otherPrompt) {
      notes.push(`Posible duplicado exacto de la pregunta ${other.orden}.`);
      break;
    }
    if (jaccardSimilarity(prompt, other.enunciado || '') >= 0.8) {
      notes.push(`Enunciado muy similar a la pregunta ${other.orden}; revisión editorial recomendada.`);
      break;
    }
  }

  if (Array.isArray(question.opciones)) {
    if (question.opciones.some((option) => !cleanString(option.retroalimentacion, 5000))) {
      notes.push('Falta retroalimentación explicativa en una o más alternativas.');
    }
    for (let index = 0; index < question.opciones.length; index += 1) {
      const option = question.opciones[index];
      if (question.opciones.some((other, otherIndex) =>
        otherIndex > index && jaccardSimilarity(option.texto || '', other.texto || '') >= 0.8
      )) {
        notes.push('Hay alternativas muy similares; comprobar que cada distractor sea plausible y distinto.');
        break;
      }
    }
  }
  return notes;
};

const validateQuestionPayload = (body) => {
  const order = Number(body.orden);
  const sourceUrl = cleanString(body.fuente_url, 2048);
  const payload = {
    orden: order,
    enunciado: cleanString(body.enunciado, 12000),
    categoria: cleanString(body.categoria, 100),
    evidencia: cleanString(body.evidencia, 5000),
    justificacion: cleanString(body.justificacion, 10000),
    clave: typeof body.clave === 'string' ? body.clave : '',
    fuente_url: sourceUrl,
  };
  if (body.fuente_url != null && body.fuente_url !== '') {
    if (!sourceUrl) {
      return { error: 'La URL de fuente no puede superar 2048 caracteres.' };
    }
    try {
      const parsedUrl = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { error: 'La URL de fuente debe usar http o https.' };
      }
    } catch {
      return { error: 'La URL de fuente no es válida.' };
    }
  }

  const options = body.opciones;
  if (
    !Number.isInteger(order) || order < 1 ||
    !payload.enunciado || !payload.categoria || !payload.evidencia || !payload.justificacion ||
    !Array.isArray(options) || options.length !== 4
  ) {
    return { error: 'Completa enunciado, evidencia, categoría, justificación, orden y las cuatro opciones A-D.' };
  }
  if (!OPTION_CODES.includes(payload.clave)) {
    return { error: 'La clave correcta debe ser exclusivamente A, B, C o D.' };
  }

  const optionByCode = new Map();
  const normalizedTexts = new Set();
  for (const option of options) {
    if (!option || !OPTION_CODES.includes(option.codigo) || optionByCode.has(option.codigo)) {
      return { error: 'Debes enviar una sola opción para cada código A, B, C y D.' };
    }
    const text = cleanString(option.texto, 5000);
    if (!text) return { error: `La opción ${option.codigo} no puede estar vacía.` };
    const normalized = normalizeForReview(text);
    if (normalizedTexts.has(normalized)) {
      return { error: 'Las cuatro opciones deben tener textos diferentes.' };
    }
    normalizedTexts.add(normalized);
    const feedback = cleanString(option.retroalimentacion, 5000);
    if (!feedback || feedback.length < 20) {
      return { error: `La retroalimentación de la opción ${option.codigo} debe explicar el razonamiento (mínimo 20 caracteres).` };
    }
    optionByCode.set(option.codigo, {
      codigo: option.codigo,
      texto: text,
      retroalimentacion: feedback,
    });
  }
  if (optionByCode.size !== OPTION_CODES.length || !optionByCode.has(payload.clave)) {
    return { error: 'La clave correcta debe corresponder a una de las cuatro opciones.' };
  }

  return {
    value: {
      ...payload,
      opciones: OPTION_CODES.map((code) => optionByCode.get(code)),
    },
  };
};

const isBlankRow = (values) => values.every((value) => value == null || value === '');

const inspectXlsxArchive = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_FILE_BYTES) {
    throw new Error('El archivo está vacío o supera el límite de 2 MB.');
  }
  if (buffer.length < 22) throw new Error('El archivo no es un libro XLSX válido.');

  const minimumOffset = Math.max(0, buffer.length - 65557);
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error('El archivo no es un libro XLSX válido.');

  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(endOffset + 6);
  const diskEntries = buffer.readUInt16LE(endOffset + 8);
  const totalEntries = buffer.readUInt16LE(endOffset + 10);
  const directorySize = buffer.readUInt32LE(endOffset + 12);
  const directoryOffset = buffer.readUInt32LE(endOffset + 16);
  const commentLength = buffer.readUInt16LE(endOffset + 20);
  if (
    diskNumber !== 0 || centralDirectoryDisk !== 0 ||
    diskEntries !== totalEntries || totalEntries > MAX_ARCHIVE_ENTRIES ||
    totalEntries === 0 || directoryOffset + directorySize > endOffset ||
    endOffset + 22 + commentLength !== buffer.length
  ) {
    throw new Error('El archivo XLSX tiene una estructura ZIP no admitida.');
  }

  const entries = new Set();
  const contents = new Map();
  const localRanges = [];
  let offset = directoryOffset;
  let totalUncompressedBytes = 0;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > directoryOffset + directorySize || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('El directorio del archivo XLSX está dañado.');
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const fileCommentLength = buffer.readUInt16LE(offset + 32);
    const expectedCrc = buffer.readUInt32LE(offset + 16);
    const externalAttributes = buffer.readUInt32LE(offset + 38);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const entryEnd = offset + 46 + nameLength + extraLength + fileCommentLength;
    if (entryEnd > directoryOffset + directorySize || nameLength === 0) {
      throw new Error('El directorio del archivo XLSX está dañado.');
    }

    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const pathParts = name.split('/');
    const unixFileType = (externalAttributes >>> 16) & 0xf000;
    if (
      name.startsWith('/') || name.includes('\\') || name.split('/').includes('..') ||
      name.includes('\0') || entries.has(name) ||
      (flags & 0x0001) !== 0 ||
      (flags & 0xf7f0) !== 0 || ![0, 8].includes(method) ||
      compressedSize === 0xffffffff || uncompressedSize === 0xffffffff ||
      unixFileType === 0xa000 ||
      pathParts.some((part, partIndex) => part === '.' || (!part && partIndex < pathParts.length - 1)) ||
      uncompressedSize > MAX_UNCOMPRESSED_BYTES ||
      (compressedSize === 0 ? uncompressedSize > 0 : uncompressedSize / compressedSize > 100)
    ) {
      throw new Error('El archivo XLSX contiene entradas no admitidas o potencialmente inseguras.');
    }
    if (
      /vbaProject\.bin|externalLinks|activex|embeddings|connections\.xml|queryTables|pivotCache/i.test(name) ||
      !(name === '[Content_Types].xml' || name === '_rels/.rels' ||
        name.startsWith('docProps/') || name.startsWith('xl/'))
    ) {
      throw new Error('No se admiten macros, vínculos externos ni contenido incrustado.');
    }

    if (localHeaderOffset + 30 > directoryOffset || buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error('El archivo XLSX contiene una entrada ZIP dañada.');
    }
    const localFlags = buffer.readUInt16LE(localHeaderOffset + 6);
    const localMethod = buffer.readUInt16LE(localHeaderOffset + 8);
    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const localCrc = buffer.readUInt32LE(localHeaderOffset + 14);
    const localName = buffer.toString(
      'utf8',
      localHeaderOffset + 30,
      localHeaderOffset + 30 + localNameLength
    );
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    if (
      localName !== name ||
      localFlags !== flags ||
      localMethod !== method ||
      dataStart > directoryOffset ||
      dataStart + compressedSize > directoryOffset ||
      (!(flags & 0x0008) && localCrc !== expectedCrc)
    ) {
      throw new Error('El archivo XLSX contiene datos fuera del archivo.');
    }
    let uncompressedData;
    try {
      const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
      uncompressedData = method === 0
        ? compressedData
        : zlib.inflateRawSync(compressedData, {
          maxOutputLength: Math.max(
            1,
            Math.min(MAX_UNCOMPRESSED_BYTES - totalUncompressedBytes, uncompressedSize + 1)
          ),
        });
    } catch {
      throw new Error('El archivo XLSX contiene una entrada comprimida inválida o demasiado grande.');
    }
    if (uncompressedData.length !== uncompressedSize) {
      throw new Error('El tamaño real de una entrada XLSX no coincide con su directorio ZIP.');
    }
    if (calculateCrc32(uncompressedData) !== expectedCrc) {
      throw new Error('El contenido de una entrada XLSX está dañado.');
    }
    let localEntryEnd = dataStart + compressedSize;
    if (flags & 0x0008) {
      let descriptorOffset = localEntryEnd;
      if (descriptorOffset + 4 <= directoryOffset &&
          buffer.readUInt32LE(descriptorOffset) === 0x08074b50) {
        descriptorOffset += 4;
      }
      if (descriptorOffset + 12 > directoryOffset ||
          buffer.readUInt32LE(descriptorOffset) !== expectedCrc ||
          buffer.readUInt32LE(descriptorOffset + 4) !== compressedSize ||
          buffer.readUInt32LE(descriptorOffset + 8) !== uncompressedSize) {
        throw new Error('El descriptor de una entrada ZIP no coincide con su contenido.');
      }
      localEntryEnd = descriptorOffset + 12;
    }
    localRanges.push([localHeaderOffset, localEntryEnd]);
    totalUncompressedBytes += uncompressedData.length;
    if (totalUncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
      throw new Error('El contenido descomprimido del archivo excede el límite permitido.');
    }
    entries.add(name);
    contents.set(name, uncompressedData);
    offset = entryEnd;
  }
  if (offset !== directoryOffset + directorySize) {
    throw new Error('El directorio del archivo XLSX no es consistente.');
  }
  localRanges.sort((left, right) => left[0] - right[0]);
  for (let index = 1; index < localRanges.length; index += 1) {
    if (localRanges[index][0] < localRanges[index - 1][1]) {
      throw new Error('El archivo XLSX contiene entradas ZIP superpuestas.');
    }
  }
  if (!entries.has('[Content_Types].xml') || !entries.has('xl/workbook.xml')) {
    throw new Error('El archivo no tiene la estructura de un libro XLSX.');
  }
  return contents;
};

const xmlEscape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const parseXml = (xml, handlers = {}) => {
  const parser = new SaxesParser({ xmlns: false, fragment: false });
  parser.on('doctype', () => {
    throw new Error('No se admiten declaraciones DTD en el archivo XLSX.');
  });
  parser.on('error', (error) => {
    throw new Error(`El XML del archivo XLSX no es válido: ${error.message}`);
  });
  if (handlers.open) parser.on('opentag', handlers.open);
  if (handlers.text) parser.on('text', handlers.text);
  if (handlers.close) parser.on('closetag', handlers.close);
  parser.write(xml).close();
};

const decodeXml = (contents, path) => {
  const data = contents.get(path);
  if (!data) throw new Error(`Falta el componente XLSX requerido: ${path}.`);
  return Buffer.from(data).toString('utf8');
};

const parseRelationships = (xml) => {
  const relationships = new Map();
  parseXml(xml, {
    open(node) {
      if (node.name !== 'Relationship') return;
      const { Id, Target, Type, TargetMode } = node.attributes;
      if (TargetMode === 'External') {
        throw new Error('No se admiten vínculos externos en el libro XLSX.');
      }
      if (!Id || !Target || !Type || relationships.has(Id)) {
        throw new Error('El archivo XLSX contiene relaciones internas inválidas.');
      }
      relationships.set(Id, { Target, Type });
    },
  });
  return relationships;
};

const normalizeWorksheetPath = (target) => {
  if (target.startsWith('/') || target.includes('\\')) {
    if (!target.startsWith('/xl/') || target.includes('\\')) {
      throw new Error('La hoja del archivo XLSX tiene una ruta no admitida.');
    }
  }
  const parts = [];
  const targetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  for (const part of targetPath.split('/')) {
    let decodedPart;
    try {
      decodedPart = decodeURIComponent(part);
    } catch {
      throw new Error('La hoja del archivo XLSX tiene una ruta no admitida.');
    }
    if (decodedPart.includes('/') || decodedPart.includes('\\')) {
      throw new Error('La hoja del archivo XLSX tiene una ruta no admitida.');
    }
    if (!decodedPart || decodedPart === '.') continue;
    if (decodedPart === '..') {
      if (!parts.length) throw new Error('La hoja del archivo XLSX tiene una ruta no admitida.');
      parts.pop();
    } else {
      parts.push(decodedPart);
    }
  }
  const path = parts.join('/');
  if (!path.startsWith('xl/worksheets/') || !path.endsWith('.xml')) {
    throw new Error('El archivo debe referenciar una única hoja XLSX interna.');
  }
  return path;
};

const parseSharedStrings = (xml) => {
  const strings = [];
  let current = null;
  let inText = false;
  parseXml(xml, {
    open(node) {
      if (node.name === 'si') {
        if (current !== null) throw new Error('La tabla de cadenas compartidas está mal formada.');
        current = '';
        if (strings.length >= MAX_SHARED_STRINGS) {
          throw new Error('El libro XLSX contiene demasiadas cadenas compartidas.');
        }
      } else if (node.name === 't' && current != null) {
        inText = true;
      }
    },
    text(value) {
      if (inText && current != null) current += value;
    },
    close(tag) {
      const name = tag.name;
      if (name === 't') inText = false;
      if (name === 'si') {
        strings.push(current);
        current = null;
      }
    },
  });
  return strings;
};

const columnNumber = (reference) => {
  const match = /^([A-Z]+)(\d+)$/i.exec(reference);
  if (!match) throw new Error('El libro XLSX contiene una referencia de celda inválida.');
  let number = 0;
  for (const letter of match[1].toUpperCase()) {
    number = number * 26 + letter.charCodeAt(0) - 64;
  }
  const row = Number(match[2]);
  if (number < 1 || number > TEMPLATE_HEADERS.length || row < 1 || row > MAX_WORKSHEET_ROWS) {
    throw new Error('La hoja excede el máximo permitido de filas o columnas.');
  }
  return { column: number, row };
};

const parseWorksheet = (xml, sharedStrings) => {
  const rows = new Map();
  const formulaRows = new Set();
  let currentCell = null;
  let valueText = '';
  let inlineText = '';
  let inValue = false;
  let inInlineText = false;

  parseXml(xml, {
    text(value) {
      if (inValue) valueText += value;
      if (inInlineText) inlineText += value;
    },
    close(tag) {
      const name = tag.name;
      if (name === 'v') inValue = false;
      if (name === 't' && currentCell?.type === 'inlineStr') inInlineText = false;
      if (name === 'c' && currentCell) {
        let value;
        if (currentCell.type === 's') {
          const index = Number(valueText);
          if (!Number.isInteger(index) || index < 0 || index >= sharedStrings.length) {
            throw new Error('La hoja XLSX contiene un índice de cadena compartida inválido.');
          }
          value = sharedStrings[index];
        } else if (currentCell.type === 'inlineStr') {
          value = inlineText;
        } else if (currentCell.type === 'str' || currentCell.type === 'n') {
          value = valueText;
        } else {
          throw new Error('Solo se admiten celdas de texto o números en la hoja XLSX.');
        }
        if (value !== '' && !formulaRows.has(currentCell.row)) {
          const row = rows.get(currentCell.row) || new Map();
          if (row.has(currentCell.column)) {
            throw new Error('La hoja XLSX contiene celdas repetidas.');
          }
          row.set(currentCell.column, value);
          rows.set(currentCell.row, row);
        }
        currentCell = null;
      }
    },
    open(node) {
      if (node.name === 'f') {
        if (currentCell) formulaRows.add(currentCell.row);
      }
      if (node.name === 'hyperlink') {
        throw new Error('No se admiten hipervínculos en la hoja XLSX.');
      }
      if (node.name === 'v' && currentCell) inValue = true;
      if (node.name === 't' && currentCell?.type === 'inlineStr') inInlineText = true;
      if (node.name !== 'c') return;
      if (currentCell) throw new Error('La hoja XLSX contiene celdas mal formadas.');
      const address = columnNumber(node.attributes.r || '');
      currentCell = { ...address, type: node.attributes.t || 'n' };
      valueText = '';
      inlineText = '';
    },
  });
  for (const rowNumber of formulaRows) {
    if (!rows.has(rowNumber)) rows.set(rowNumber, new Map());
  }
  return { rows, formulaRows };
};

const parseXlsxImport = async (buffer) => {
  const contents = inspectXlsxArchive(buffer);
  const contentTypes = decodeXml(contents, '[Content_Types].xml');
  if (/macroenabled|vbaProject|activeX|oleObject/i.test(contentTypes)) {
    throw new Error('No se admiten macros ni contenido activo en el archivo XLSX.');
  }

  for (const [path, data] of contents) {
    if (path.endsWith('.rels')) parseRelationships(Buffer.from(data).toString('utf8'));
  }

  const packageRelationships = parseRelationships(decodeXml(contents, '_rels/.rels'));
  if (![...packageRelationships.values()].some((relationship) =>
    relationship.Type.endsWith('/officeDocument') && relationship.Target === 'xl/workbook.xml'
  )) {
    throw new Error('El archivo XLSX no contiene una relación interna válida con el libro.');
  }

  const workbookSheets = [];
  parseXml(decodeXml(contents, 'xl/workbook.xml'), {
    open(node) {
      if (node.name !== 'sheet') return;
      workbookSheets.push({
        state: node.attributes.state || 'visible',
        relationshipId: node.attributes['r:id'],
      });
    },
  });
  if (workbookSheets.length !== 1 || workbookSheets[0].state !== 'visible') {
    throw new Error('El archivo debe contener una única hoja visible.');
  }

  const workbookRelationships = parseRelationships(
    decodeXml(contents, 'xl/_rels/workbook.xml.rels')
  );
  const worksheetRelationship = workbookRelationships.get(workbookSheets[0].relationshipId);
  if (!worksheetRelationship || !worksheetRelationship.Type.endsWith('/worksheet')) {
    throw new Error('El archivo XLSX no referencia una hoja de cálculo válida.');
  }
  const worksheetPath = normalizeWorksheetPath(worksheetRelationship.Target);
  const { rows, formulaRows } = parseWorksheet(decodeXml(contents, worksheetPath), contents.has('xl/sharedStrings.xml')
    ? parseSharedStrings(decodeXml(contents, 'xl/sharedStrings.xml'))
    : []);

  const rowValues = (rowNumber) => TEMPLATE_HEADERS.map((_, index) =>
    rows.get(rowNumber)?.get(index + 1) ?? ''
  );
  const headers = rowValues(4);
  if (headers.some((header, index) => header !== TEMPLATE_HEADERS[index])) {
    return {
      questions: [],
      detected: 0,
      errors: [{
        fila: 4,
        mensaje: 'Los encabezados no coinciden con la plantilla oficial; descarga una plantilla nueva.',
      }],
    };
  }

  const questions = [];
  const errors = [...formulaRows]
    .filter((rowNumber) => rowNumber >= 5)
    .map((rowNumber) => ({ fila: rowNumber, mensaje: 'No se admiten celdas con fórmulas.' }));
  let detected = errors.length;
  for (const rowNumber of [...rows.keys()].sort((left, right) => left - right)) {
    if (rowNumber < 5 || formulaRows.has(rowNumber)) continue;
    const values = rowValues(rowNumber);
    if (isBlankRow(values)) continue;
    if (values[0] === EXAMPLE_MARKER) continue;

    detected += 1;
    if (detected > MAX_QUESTIONS_PER_FILE) {
      errors.push({ fila: rowNumber, mensaje: 'El archivo supera el límite de 200 preguntas.' });
      break;
    }

    const record = Object.fromEntries(TEMPLATE_HEADERS.map((header, index) => [header, values[index]]));
    const order = Number(record.numero);
    const question = {
      orden: order,
      categoria: record.categoria,
      evidencia: record.evidencia,
      enunciado: record.enunciado,
      clave: record.clave_correcta,
      justificacion: record.justificacion,
      fuente_url: record.fuente_url,
      opciones: OPTION_CODES.map((code) => ({
        codigo: code,
        texto: record[`opcion_${code.toLowerCase()}`],
        retroalimentacion: record[`retroalimentacion_${code.toLowerCase()}`],
      })),
    };
    questions.push({ fila: rowNumber, question });
  }

  const seenOrders = new Map();
  for (const item of questions) {
    if (Number.isInteger(item.question.orden)) {
      const previousRow = seenOrders.get(item.question.orden);
      if (previousRow) {
        errors.push({
          fila: previousRow,
          mensaje: `El número ${item.question.orden} está repetido (también aparece en la fila ${item.fila}).`,
        });
        errors.push({
          fila: item.fila,
          mensaje: `El número ${item.question.orden} está repetido (también aparece en la fila ${previousRow}).`,
        });
      } else {
        seenOrders.set(item.question.orden, item.fila);
      }
    }
  }

  return {
    questions,
    detected,
    errors,
  };
};

const buildTemplateBuffer = async () => {
  const example = {
    numero: EXAMPLE_MARKER,
    categoria: 'Evaluación formativa',
    evidencia: 'Analiza evidencias de aprendizaje para ajustar una estrategia de aula.',
    enunciado: 'En una institución educativa, una docente revisa producciones diversas de su grupo y observa que varios estudiantes aplican un procedimiento de memoria, pero tienen dificultad para explicar por qué funciona. ¿Qué decisión pedagógica permite obtener nuevas evidencias y orientar el siguiente paso de aprendizaje?',
    opcion_a: 'Aplicar una actividad breve donde expliquen su razonamiento y usar los resultados para ajustar la mediación.',
    retroalimentacion_a: 'Esta opción recoge evidencia del razonamiento y permite ajustar la enseñanza con base en lo observado.',
    opcion_b: 'Repetir exactamente la explicación y asumir que la práctica adicional resolverá la dificultad.',
    retroalimentacion_b: 'Repetir la explicación sin recoger nuevas evidencias no permite saber qué obstáculo persiste.',
    opcion_c: 'Calificar el procedimiento memorizado y cerrar la actividad para avanzar al siguiente tema.',
    retroalimentacion_c: 'La calificación aislada no ofrece información suficiente para decidir cómo apoyar la comprensión.',
    opcion_d: 'Separar a quienes tuvieron dificultades y asignarles más ejercicios iguales sin seguimiento.',
    retroalimentacion_d: 'Más ejercicios idénticos sin analizar el razonamiento pueden reproducir la dificultad observada.',
    clave_correcta: 'A',
    justificacion: 'La evaluación formativa usa evidencias del proceso para ajustar la mediación y ofrecer oportunidades de explicación, práctica y seguimiento.',
    fuente_url: '',
  };
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
  const columns = TEMPLATE_HEADERS.map((header) => ({
    key: header,
    width: header.includes('retroalimentacion') ? 42 :
      ['enunciado', 'justificacion', 'evidencia'].includes(header) ? 48 :
        header === 'fuente_url' ? 36 : 24,
  }));
  columns[0].width = 28;

  const inlineCell = (reference, value, style = 0) =>
    `<c r="${reference}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
  const rows = [
    `<row r="1" ht="26" customHeight="1">${inlineCell('A1', 'PLANTILLA DE IMPORTACIÓN · BORRADORES DEL DIAGNÓSTICO', 1)}</row>`,
    `<row r="2" ht="30" customHeight="1">${inlineCell('A2', 'Complete una fila por pregunta. No cambie los encabezados. Solo se admite .xlsx sin macros; máximo 200 preguntas y 2 MB.')}</row>`,
    `<row r="3" ht="30" customHeight="1">${inlineCell('A3', `La fila ${EXAMPLE_MARKER} es demostrativa y se ignorará durante la importación. Revise cada fuente y contenido antes de confirmar.`, 2)}</row>`,
    `<row r="4" ht="32" customHeight="1">${TEMPLATE_HEADERS.map((header, index) => inlineCell(`${columnName(index + 1)}4`, header, 1)).join('')}</row>`,
    `<row r="5">${TEMPLATE_HEADERS.map((header, index) => {
      const value = header === 'numero' ? example.numero : example[header];
      return value ? inlineCell(`${columnName(index + 1)}5`, value, 2) : '';
    }).join('')}</row>`,
  ];
  const colXml = columns.map((column, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`
  ).join('');
  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:O5"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/><cols>${colXml}</cols><sheetData>${rows.join('')}</sheetData>
<mergeCells count="3"><mergeCell ref="A1:O1"/><mergeCell ref="A2:O2"/><mergeCell ref="A3:O3"/></mergeCells>
<dataValidations count="1"><dataValidation type="list" allowBlank="0" sqref="M6:M205"><formula1>"A,B,C,D"</formula1></dataValidation></dataValidations>
</worksheet>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><i/><sz val="11"/><color rgb="FF9C0006"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17365D"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Importación" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="0" fullCalcOnLoad="0" forceFullCalc="0"/>
</workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    'xl/worksheets/sheet1.xml': worksheetXml,
    'xl/styles.xml': stylesXml,
  };
  const archive = Object.fromEntries(Object.entries(files).map(([path, value]) => [path, strToU8(value)]));
  return Buffer.from(zipSync(archive, { level: 6 }));
};

module.exports = {
  EXAMPLE_MARKER,
  MAX_FILE_BYTES,
  MAX_QUESTIONS_PER_FILE,
  TEMPLATE_HEADERS,
  XLSX_MIME_TYPE,
  buildTemplateBuffer,
  jaccardSimilarity,
  normalizeForReview,
  parseXlsxImport,
  questionReviewNotes,
  validateQuestionPayload,
};
