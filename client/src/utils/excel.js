import * as XLSX from 'xlsx';

export function downloadExcelTemplate(filename, headers) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers.map((header) => (
    typeof header === 'string' ? header : Array.isArray(header) ? header[1] : header.label
  ))]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
  XLSX.writeFile(workbook, filename);
}

export function downloadExcel(filename, headers, rows) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  XLSX.writeFile(workbook, filename);
}

export function readExcelFile(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  if (!['xlsx', 'xls', 'csv'].includes(extension)) {
    return Promise.reject(new Error('Formato no compatible. Seleccione un archivo .xlsx, .xls o .csv.'));
  }

  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: false });
    if (!workbook.SheetNames.length) throw new Error('El archivo no contiene hojas de cálculo.');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    return rows.map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim(),
      ]),
    ));
  });
}

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function mapExcelRow(row, definitions) {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  );
  return Object.fromEntries(definitions.map(({ key, label }) => [
    key,
    normalizedRow[normalizeHeader(label)] ?? normalizedRow[normalizeHeader(key)] ?? '',
  ]));
}

export function normalizeExcelText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function similarity(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.82;
  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
  }
  return 1 - matrix[left.length][right.length] / Math.max(left.length, right.length);
}

export function matchExcelHeaders(headers, definitions, threshold = 0.55) {
  const used = new Set();
  const matches = {};
  const unknown = [];
  headers.forEach((header) => {
    const normalized = normalizeExcelText(header);
    const candidates = definitions.flatMap((definition) => [
      definition.label,
      definition.key,
      ...(definition.aliases || []),
    ].map((candidate) => ({
      key: definition.key,
      score: similarity(normalized, normalizeExcelText(candidate)),
    })));
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates.find((candidate) => !used.has(candidate.key));
    if (best && best.score >= threshold) {
      matches[best.key] = { header, score: best.score };
      used.add(best.key);
    } else {
      unknown.push({ header, score: best?.score || 0 });
    }
  });
  return { matches, unknown };
}

export function readImportExcelFile(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  if (!['xlsx', 'xls'].includes(extension)) {
    return Promise.reject(new Error('Formato no compatible. Seleccione un archivo .xlsx o .xls.'));
  }
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: false });
    if (!workbook.SheetNames.length) throw new Error('El archivo no contiene hojas de cálculo.');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
    return {
      headers: rows.length ? Object.keys(rows[0]) : [],
      rows: rows.map((row, index) => ({
        rowNumber: index + 2,
        values: Object.fromEntries(Object.entries(row).map(([key, value]) => [
          key,
          value instanceof Date ? value : String(value ?? '').trim(),
        ])),
      })),
    };
  });
}
