import { useEffect, useRef, useState } from 'react';
import { Download, Printer, Upload, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { downloadEquipmentDocument, equipmentApi, operationsApi } from '../services/api';
import { downloadExcel, matchExcelHeaders, normalizeExcelText, readImportExcelFile } from '../utils/excel';

const tabs = [
  { id: 'life', label: 'Hoja de vida' },
  { id: 'maintenance', label: 'Mantenimientos' },
  { id: 'incidents', label: 'Novedades' },
];

const emptyMaintenance = {
  type: 'PREVENTIVE',
  status: 'SCHEDULED',
  scheduledDate: '',
  description: '',
  company: '',
  responsible: '',
  workPerformed: '',
  cost: '',
  observations: '',
};

const emptyIncident = {
  reportNumber: '',
  reporterName: '',
  reportedAt: new Date().toISOString().slice(0, 10),
  priority: 'MEDIUM',
  description: '',
  observations: '',
};

const maintenanceImportDefinitions = [
  { key: 'type', label: 'Tipo', aliases: ['tipo mantenimiento', 'tipo de mantenimiento', 'mantenimiento'] },
  { key: 'status', label: 'Estado', aliases: ['situacion', 'estado mantenimiento'] },
  { key: 'scheduledDate', label: 'Programado', aliases: ['fecha', 'fecha mantenimiento', 'fecha programada', 'programacion', 'fecha mantto'] },
  { key: 'company', label: 'Empresa', aliases: ['proveedor', 'empresa responsable', 'contratista'] },
  { key: 'responsible', label: 'Responsable', aliases: ['tecnico', 'ingeniero', 'encargado'] },
  { key: 'cost', label: 'Costo', aliases: ['valor', 'precio', 'costo mantenimiento', 'importe'] },
  { key: 'description', label: 'Descripción', aliases: ['observacion', 'detalle', 'trabajo realizado', 'descripcion mantenimiento'] },
  { key: 'workPerformed', label: 'Trabajo realizado', aliases: ['trabajo ejecutado', 'labor realizada'] },
  { key: 'observations', label: 'Observaciones', aliases: ['comentarios', 'notas'] },
];

const incidentImportDefinitions = [
  { key: 'reportNumber', label: 'Número de reporte', aliases: ['reporte', 'numero 018000', 'radicado'] },
  { key: 'reporterName', label: 'Quien reporta', aliases: ['reportante', 'usuario reporta'] },
  { key: 'reportedAt', label: 'Fecha', aliases: ['fecha reporte', 'fecha novedad', 'fecha incidente'] },
  { key: 'priority', label: 'Prioridad', aliases: ['nivel', 'severidad'] },
  { key: 'status', label: 'Estado', aliases: ['situacion', 'estado novedad', 'estado incidente'] },
  { key: 'description', label: 'Descripción', aliases: ['detalle', 'novedad', 'descripcion novedad'] },
  { key: 'observations', label: 'Observaciones', aliases: ['comentarios', 'notas'] },
];

function normalizeImportDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    return `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  if (/^\d+(\.\d+)?$/.test(text)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Number(text) * 86400000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function normalizeImportValue(key, value) {
  const text = String(value ?? '').trim();
  const normalized = normalizeExcelText(text);
  if (key === 'type') {
    if (['preventivo', 'prevencion', 'mantenimientopreventivo'].includes(normalized)) return 'PREVENTIVE';
    if (['correctivo', 'reparacion'].includes(normalized)) return 'CORRECTIVE';
    if (normalized.includes('calibr')) return 'CALIBRATION';
    if (normalized.includes('inspeccion')) return 'INSPECTION';
  }
  if (key === 'status') {
    if (['programado', 'programados', 'programadas', 'pendiente', 'pendientes'].includes(normalized)) return 'SCHEDULED';
    if (['enejecucion', 'ejecutando', 'ejecucion'].includes(normalized)) return 'IN_PROGRESS';
    if (['completado', 'completados', 'completada', 'completadas', 'realizado', 'realizados', 'realizada', 'realizadas', 'terminado', 'terminados', 'terminada', 'terminadas', 'ejecutado', 'ejecutados', 'ejecutada', 'ejecutadas'].includes(normalized)) return 'COMPLETED';
    if (['cancelado', 'cancelados', 'cancelada', 'canceladas'].includes(normalized)) return 'CANCELLED';
  }
  if (key === 'priority') {
    if (['baja', 'low'].includes(normalized)) return 'LOW';
    if (['mediana', 'media', 'medium'].includes(normalized)) return 'MEDIUM';
    if (['alta', 'high'].includes(normalized)) return 'HIGH';
    if (['critica', 'critical'].includes(normalized)) return 'CRITICAL';
  }
  if (key === 'status') {
    if (['cerrado', 'closed', 'resuelto', 'resolved'].includes(normalized)) return normalized === 'closed' || normalized === 'cerrado' ? 'CLOSED' : 'RESOLVED';
    if (['abierta', 'abierto', 'open', 'reportada', 'reported', 'pendiente'].includes(normalized)) return 'REPORTED';
    return text ? '' : 'REPORTED';
  }
  if (['scheduledDate', 'reportedAt'].includes(key)) return normalizeImportDate(value);
  if (key === 'cost') {
    const number = Number(text.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    return text && !Number.isNaN(number) ? number : text;
  }
  return text;
}

const maintenanceExportColumns = [
  { label: 'Tipo', render: (item) => item.type || '-' },
  { label: 'Estado', render: (item) => item.status || '-' },
  { label: 'Fecha programada', render: (item) => item.scheduledDate ? item.scheduledDate.slice(0, 10) : '-' },
  { label: 'Empresa', render: (item) => item.company || '-' },
  { label: 'Responsable', render: (item) => item.responsible || item.technician?.name || '-' },
  { label: 'Costo', render: (item) => item.cost == null ? '-' : Number(item.cost) },
  { label: 'Descripción', render: (item) => item.description || '-' },
  { label: 'Observaciones', render: (item) => item.observations || '-' },
];

const incidentExportColumns = [
  { label: 'Número de reporte', render: (item) => item.reportNumber || '-' },
  { label: 'Quien reporta', render: (item) => item.reporterName || item.reportedBy?.name || '-' },
  { label: 'Prioridad', render: (item) => item.priority || '-' },
  { label: 'Estado', render: (item) => item.status || '-' },
  { label: 'Fecha', render: (item) => item.reportedAt ? item.reportedAt.slice(0, 10) : '-' },
  { label: 'Descripción', render: (item) => item.description || '-' },
  { label: 'Observaciones', render: (item) => item.observations || '-' },
];

function exportRecordsExcel(filename, columns, items) {
  downloadExcel(filename, columns.map((column) => column.label), items.map((item) => (
    columns.map((column) => column.render(item))
  )));
}

function printRecordsDocument(title, columns, items) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const headersHtml = columns.map((column) => `<th>${column.label}</th>`).join('');
  const rowsHtml = items.map((item) => (
    `<tr>${columns.map((column) => `<td>${String(column.render(item) ?? '-')}</td>`).join('')}</tr>`
  )).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title>
    <style>
      * { box-sizing: border-box; } body { margin: 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 12px; }
      .sheet { max-width: 1100px; margin: 0 auto; } .header { background: #1f2a40; color: #fff; padding: 28px 36px; text-align: center; }
      h1 { margin: 0; font-size: 24px; } .subtitle { margin-top: 8px; color: #c5cfdf; } .content { padding: 24px 28px; }
      table { width: 100%; border-collapse: collapse; } tr:nth-child(even) { background: #f5f7fb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #e4e8ef; text-align: left; vertical-align: top; } th { color: #68778a; font-size: 10px; text-transform: uppercase; }
      @page { size: landscape; margin: 10mm; } @media print { .header, tr:nth-child(even) { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style></head><body><div class="sheet"><header class="header"><h1>${title}</h1><div class="subtitle">${items.length} registro(s) · ${new Date().toLocaleString('es-CO')}</div></header>
    <main class="content"><table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml || '<tr><td colspan="8">Sin registros</td></tr>'}</tbody></table></main></div></body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  let printed = false;
  const print = () => {
    if (printed || printWindow.closed) return;
    printed = true;
    printWindow.focus();
    printWindow.print();
  };
  printWindow.addEventListener('load', print, { once: true });
  setTimeout(print, 500);
}

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [tab, setTab] = useState('life');
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenance);
  const [maintenanceEditId, setMaintenanceEditId] = useState(null);
  const [incidentForm, setIncidentForm] = useState(emptyIncident);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [documentType, setDocumentType] = useState('OTHER');
  const [documentExpiration, setDocumentExpiration] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [bulkMaintenanceRows, setBulkMaintenanceRows] = useState([emptyMaintenance]);
  const [bulkIncidentRows, setBulkIncidentRows] = useState([emptyIncident]);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState('');
  const importInputRef = useRef(null);

  async function loadEquipment() {
    const data = await equipmentApi.get(id);
    setEquipment(data);
  }

  useEffect(() => {
    loadEquipment().catch((err) => setError(err.message));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('¿Eliminar esta hoja de vida?')) return;
    await equipmentApi.remove(id);
    navigate('/equipos');
  }

  async function handleMaintenanceSubmit(event) {
    event.preventDefault();
    try {
      const payload = {
        ...maintenanceForm,
        equipmentId: id,
        cost: maintenanceForm.cost === '' ? null : Number(maintenanceForm.cost),
      };
      if (maintenanceEditId) {
        await operationsApi.maintenance.update(maintenanceEditId, payload);
        setMessage('Mantenimiento actualizado.');
      } else {
        await operationsApi.maintenance.create(payload);
        setMessage('Mantenimiento registrado.');
      }
      setError('');
      setMaintenanceEditId(null);
      setMaintenanceForm(emptyMaintenance);
      await loadEquipment();
    } catch (err) {
      setError(`No se pudo guardar el mantenimiento: ${err.message}`);
    }
  }

  async function handleMaintenanceDelete(maintenanceId) {
    if (!window.confirm('¿Eliminar este mantenimiento?')) return;
    try {
      await operationsApi.maintenance.remove(maintenanceId);
      setMessage('Mantenimiento eliminado.');
      await loadEquipment();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleIncidentSubmit(event) {
    event.preventDefault();
    try {
      await operationsApi.incidents.create({ ...incidentForm, equipmentId: id });
      setIncidentForm(emptyIncident);
      setMessage('Novedad registrada.');
      setError('');
      await loadEquipment();
    } catch (err) {
      setError(`No se pudo guardar la novedad: ${err.message}`);
    }
  }

  async function handleIncidentDelete(incidentId) {
    if (!window.confirm('¿Eliminar esta novedad?')) return;
    try {
      await operationsApi.incidents.remove(incidentId);
      setMessage('Novedad eliminada.');
      await loadEquipment();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleIncidentClose(incidentId) {
    try {
      await operationsApi.incidents.update(incidentId, { status: 'RESOLVED' });
      setMessage('Novedad cerrada.');
      setError('');
      await loadEquipment();
    } catch (err) {
      setError(`No se pudo cerrar la novedad: ${err.message}`);
    }
  }

  async function handleDocumentUpload(event) {
    event.preventDefault();
    if (!documentFile) return;
    try {
      const body = new FormData();
      body.append('file', documentFile);
      body.append('documentType', documentType);
      body.append('expirationDate', documentExpiration);
      await equipmentApi.uploadDocument(id, body);
      setDocumentFile(null);
      setDocumentExpiration('');
      setMessage('Documento cargado.');
      await loadEquipment();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDocumentDelete(documentId) {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await equipmentApi.deleteDocument(id, documentId);
      await loadEquipment();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitBulk(kind) {
    try {
      const rows = kind === 'maintenance' ? bulkMaintenanceRows : bulkIncidentRows;
      const payload = rows.map((row) => ({
        ...row,
        equipmentId: id,
        cost: row.cost === '' ? null : Number(row.cost),
      }));
      await operationsApi[kind].bulkCreate(payload);
      setMessage('Registros masivos guardados.');
      await loadEquipment();
      if (kind === 'maintenance') {
        setBulkMaintenanceRows([emptyMaintenance]);
      } else {
        setBulkIncidentRows([emptyIncident]);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImportFile(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
          setImportError('');
          const parsed = await readImportExcelFile(file);
          const kind = tab === 'maintenance' ? 'maintenance' : 'incidents';
          const definitions = kind === 'maintenance' ? maintenanceImportDefinitions : incidentImportDefinitions;
          const { matches, unknown } = matchExcelHeaders(parsed.headers, definitions);
          const existing = kind === 'maintenance' ? equipment.maintenances : equipment.incidents;
          const seenInFile = new Set();
          const records = parsed.rows.map(({ rowNumber, values }) => {
            const record = Object.fromEntries(Object.entries(matches).map(([key, match]) => [
              key,
              normalizeImportValue(key, values[match.header]),
            ]));
            if (kind === 'maintenance') {
              record.equipmentId = id;
              record.status = record.status || 'SCHEDULED';
            } else {
              record.equipmentId = id;
              record.status = record.status || 'REPORTED';
            }
            const errors = [];
            if (kind === 'maintenance') {
              if (!record.type) errors.push({ field: 'Tipo', value: '', error: 'Campo obligatorio vacío', solution: 'Indique preventivo, correctivo, calibración o inspección.' });
              if (!record.scheduledDate) errors.push({ field: 'Programado', value: '', error: 'Fecha inválida o vacía', solution: 'Use DD/MM/YYYY, YYYY-MM-DD o una fecha de Excel.' });
              if (record.cost !== '' && typeof record.cost !== 'number') errors.push({ field: 'Costo', value: record.cost, error: 'Costo no numérico', solution: 'Use un valor numérico.' });
            } else {
              if (!record.description || record.description.length < 3) errors.push({ field: 'Descripción', value: record.description || '', error: 'Campo obligatorio vacío', solution: 'Describa la novedad.' });
              if (!record.reportedAt) errors.push({ field: 'Fecha', value: '', error: 'Fecha inválida o vacía', solution: 'Use DD/MM/YYYY, YYYY-MM-DD o una fecha de Excel.' });
              if (!record.priority) errors.push({ field: 'Prioridad', value: '', error: 'Prioridad inválida o vacía', solution: 'Use baja, media, alta o crítica.' });
            }
            const signature = kind === 'maintenance'
              ? `${record.type}|${record.scheduledDate}|${normalizeExcelText(record.description)}`
              : `${record.reportNumber}|${record.reportedAt}|${normalizeExcelText(record.description)}`;
            const duplicateInDatabase = existing.some((item) => kind === 'maintenance'
              ? item.type === record.type && String(item.scheduledDate || '').slice(0, 10) === record.scheduledDate
              : (record.reportNumber && item.reportNumber === record.reportNumber)
                || (String(item.reportedAt || '').slice(0, 10) === record.reportedAt && item.description === record.description));
            const duplicateInFile = seenInFile.has(signature);
            const duplicate = duplicateInDatabase || duplicateInFile;
            seenInFile.add(signature);
            if (duplicate) errors.push({ field: 'Registro', value: '', error: 'Posible duplicado', solution: 'Decida si desea incluirlo o excluirlo desde esta vista.' });
            return { rowNumber, record, errors, duplicate, includeDuplicate: false, duplicateSource: duplicateInDatabase ? 'Ya existe en el equipo' : 'Repetido en el archivo' };
          });
          setImportPreview({
            kind,
            fileName: file.name,
            headers: parsed.headers,
            matches,
            unknown,
            records,
          });
        } catch (err) {
          setImportError(err.message);
        }
  }

  async function confirmImport() {
        if (!importPreview) return;
        const valid = importPreview.records
          .filter((item) => item.errors.filter((error) => error.error !== 'Posible duplicado').length === 0)
          .filter((item) => !item.duplicate || item.includeDuplicate)
          .map(({ record }) => record);
        if (!valid.length) {
          setImportError('No hay filas válidas para importar.');
          return;
        }
        try {
          const cleanRecords = valid.map((record) => Object.fromEntries(
            Object.entries(record).map(([key, value]) => [key, value === '' ? null : value]),
          ));
          if (importPreview.kind === 'maintenance') await operationsApi.maintenance.bulkCreate(cleanRecords);
          else await operationsApi.incidents.bulkCreate(cleanRecords);
          setMessage(`${valid.length} registro(s) importado(s) correctamente.`);
          setImportPreview(null);
          setImportError('');
          await loadEquipment();
        } catch (err) {
          setImportError(`No se pudieron importar los registros: ${err.message}. Revise las filas seleccionadas y vuelva a intentar.`);
        }
  }

  function downloadImportErrors() {
        if (!importPreview) return;
        const rows = importPreview.records.flatMap(({ rowNumber, record, errors }) => errors.map((item) => [
          rowNumber,
          item.field,
          item.value || record[item.field] || '',
          item.error,
          item.solution,
        ]));
        downloadExcel(`errores-importacion-${importPreview.kind}.xlsx`, ['Fila', 'Campo', 'Valor recibido', 'Error', 'Solución sugerida'], rows);
  }

  function toggleImportDuplicate(rowNumber) {
    setImportPreview((current) => current ? ({
      ...current,
      records: current.records.map((item) => item.rowNumber === rowNumber
        ? { ...item, includeDuplicate: !item.includeDuplicate }
        : item),
    }) : current);
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  function printSingleRecord(title, columns, item) {
    printRecordsDocument(title, columns, [item]);
  }

  function printEquipmentSheet() {
    const contract = equipment.contracts?.[0];
    const quality = equipment.qualityControls?.[0];
    const dicom = equipment.dicomConfig;
    const rows = [
      ['Equipo', equipment.name],
      ['Marca / Modelo', `${equipment.brand} ${equipment.model || ''}`.trim() || '-'],
      ['Serial / Inventario', `${equipment.serialNumber || '-'} / ${equipment.inventoryCode || '-'}`],
      ['Área', equipment.area?.name || '-'],
      ['Ubicación', equipment.location || '-'],
      ['Estado', equipment.status || '-'],
      ['Contrato', contract?.company || '-'],
      ['Costo contrato', contract?.cost == null ? '-' : formatCurrency(contract.cost)],
      ['Inicio contrato', contract?.startDate || '-'],
      ['Fin contrato', contract?.endDate || '-'],
      ['Último control', quality?.controlDate || '-'],
      ['Próximo control', quality?.nextControlDate || '-'],
      ['Costo control', quality?.cost == null ? '-' : formatCurrency(quality.cost)],
      ['AETitle equipo', dicom?.aeTitle || '-'],
      ['IP equipo', dicom?.ipAddress || '-'],
      ['AEtitle RIS', dicom?.risAeTitle || '-'],
      ['IP RIS', dicom?.risIpAddress || '-'],
      ['AEtitle PACS', dicom?.pacsAeTitle || '-'],
      ['IP PACS', dicom?.pacsIpAddress || '-'],
      ['Puerto equipo', dicom?.port || '-'],
      ['Puerto RIS', dicom?.risPort || '-'],
      ['Puerto PACS', dicom?.pacsPort || '-'],
      ['AniDesk', dicom?.anidesk || '-'],
      ['Observaciones', equipment.observations || '-'],
    ];

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = rows.map(([label, value]) => `<tr><th>${label}</th><td>${String(value)}</td></tr>`).join('');
    const photoHtml = equipment.photoPath
      ? `<section class="photo-section"><h2>Foto del equipo</h2><img src="${equipment.photoPath}" alt="Fotografía de ${equipment.name}" /></section>`
      : '';
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Hoja de vida - ${equipment.name}</title>
          <style>
            :root { color-scheme: light; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #fff; color: #1f2937; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.45; }
            .sheet { max-width: 920px; margin: 0 auto; }
            .header { background: #1f2a40; color: #fff; min-height: 158px; padding: 32px 42px 26px; text-align: center; }
            h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: .2px; }
            .subtitle { margin: 10px 0 0; color: #c5cfdf; font-size: 13px; }
            .date { margin-top: 14px; color: #e5eaf2; font-size: 11px; }
            .content { padding: 28px 48px 40px; }
            .section-title, .photo-section h2 { margin: 0 0 12px; border-bottom: 2px solid #9aa4b2; padding-bottom: 8px; color: #1f2a40; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
            table { width: 100%; border-collapse: collapse; }
            tr:nth-child(odd) { background: #f5f7fb; }
            th, td { padding: 11px 14px; border-bottom: 1px solid #e4e8ef; text-align: left; vertical-align: top; }
            th { width: 34%; color: #68778a; font-size: 12px; font-weight: 700; }
            td { color: #273142; font-size: 14px; font-weight: 500; }
            .photo-section { margin-top: 28px; }
            .photo-section img { display: block; width: auto; max-width: 300px; max-height: 330px; border: 1px solid #dce3ed; object-fit: contain; }
            @page { size: auto; margin: 12mm; }
            @media print { .sheet { max-width: none; } .header { print-color-adjust: exact; -webkit-print-color-adjust: exact; } tr:nth-child(odd) { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <h1>Hoja de vida de ${equipment.name}</h1>
              <div class="subtitle">Ficha técnica y trazabilidad del equipo biomédico</div>
              <div class="date">Fecha de impresión: ${new Date().toLocaleString('es-CO')}</div>
            </div>
            <main class="content">
              <div class="section-title">Información del equipo</div>
              <table><tbody>${rowsHtml}</tbody></table>
              ${photoHtml}
            </main>
          </div>
        </body>
      </html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    let printed = false;
    const print = () => {
      if (printed || printWindow.closed) return;
      printed = true;
      printWindow.focus();
      printWindow.print();
    };
    const printWhenReady = () => {
      const images = Array.from(printWindow.document.images);
      if (!images.length || images.every((image) => image.complete)) {
        print();
        return;
      }
      Promise.all(images.map((image) => new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      }))).then(print);
    };
    printWindow.addEventListener('load', () => {
      printWhenReady();
    }, { once: true });
    setTimeout(() => {
      printWhenReady();
    }, 800);
  }

  if (error) return <div className="card">{error}</div>;
  if (!equipment) return <div className="card">Cargando hoja de vida...</div>;

  return (
    <>
      {importPreview && (
        <div className="import-modal-backdrop" role="dialog" aria-modal="true">
          <div className="import-modal">
            <div className="section-heading">
              <div>
                <h2 style={{ marginTop: 0 }}>Vista previa de importación</h2>
                <p>{importPreview.fileName} · primera hoja</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setImportPreview(null)}><X size={16} /> Cerrar</button>
            </div>
            <div className="import-summary">
              <span>Total: <strong>{importPreview.records.length}</strong></span>
              <span>Válidas: <strong>{importPreview.records.filter((item) => item.errors.filter((error) => error.error !== 'Posible duplicado').length === 0 && (!item.duplicate || item.includeDuplicate)).length}</strong></span>
              <span>Con errores: <strong>{importPreview.records.filter((item) => item.errors.length).length}</strong></span>
              <span>Duplicados: <strong>{importPreview.records.filter((item) => item.duplicate).length}</strong> (seleccione cuáles incluir)</span>
            </div>
            <p><strong>Campos reconocidos:</strong> {Object.values(importPreview.matches).map((item) => `${item.header} (${Math.round(item.score * 100)}%)`).join(', ') || 'Ninguno'}</p>
            <p><strong>Campos no reconocidos:</strong> {importPreview.unknown.map((item) => item.header).join(', ') || 'Ninguno'}</p>
            {importError && <div className="alert-error">{importError}</div>}
            <div className="import-preview-table">
              <table>
                <thead><tr><th>Fila</th>{(importPreview.kind === 'maintenance' ? maintenanceImportDefinitions : incidentImportDefinitions).map((definition) => <th key={definition.key}>{definition.label}</th>)}<th>Resultado</th></tr></thead>
                <tbody>
                  {importPreview.records.map(({ rowNumber, record, errors, duplicate, includeDuplicate, duplicateSource }) => (
                    <tr key={rowNumber}>
                      <td>{rowNumber}</td>
                      {(importPreview.kind === 'maintenance' ? maintenanceImportDefinitions : incidentImportDefinitions).map((definition) => <td key={definition.key}>{record[definition.key] ?? ''}</td>)}
                      <td>{duplicate ? <button type="button" className={`btn ${includeDuplicate ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggleImportDuplicate(rowNumber)}>{includeDuplicate ? 'Excluir duplicado' : 'Incluir duplicado'} · {duplicateSource}</button> : (errors.length ? errors.map((item) => item.error).join('; ') : 'Lista para importar')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="section-actions">
              {importPreview.records.some((item) => item.errors.length) && <button type="button" className="btn btn-secondary" onClick={downloadImportErrors}><Download size={16} /> Descargar errores</button>}
              <button type="button" className="btn btn-secondary" onClick={() => setImportPreview(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={confirmImport} disabled={!importPreview.records.some((item) => item.errors.filter((error) => error.error !== 'Posible duplicado').length === 0 && (!item.duplicate || item.includeDuplicate))}>Importar registros</button>
            </div>
          </div>
        </div>
      )}
      <input ref={importInputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleImportFile} style={{ display: 'none' }} />
      <div className="page">
      <div className="page-header">
        <div>
          <h1>{equipment.name}</h1>
          <p>
            {equipment.brand} {equipment.model || ''} · Serie {equipment.serialNumber}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={printEquipmentSheet}>
            <Printer size={16} /> PDF
          </button>
          <Link className="btn btn-secondary" to={`/equipos/${id}/editar`}>
            Editar
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            Eliminar
          </button>
        </div>
      </div>

      {message && <div className="card">{message}</div>}

      <div className="tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`tab ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'life' && (
        <>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div>
              {equipment.photoPath ? (
                <img
                  src={equipment.photoPath}
                  alt={`Fotografía de ${equipment.name}`}
                  style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 12, background: 'var(--surface-soft)' }}
                />
              ) : (
                <div className="card" style={{ margin: 0, minHeight: 180, display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
                  Sin fotografía
                </div>
              )}
            </div>
            <div className="form-grid">
              <Info label="Área" value={equipment.area?.name || 'Sin área'} />
              <Info label="Ubicación" value={equipment.location || '-'} />
              <Info label="Modalidad" value={equipment.modality || '-'} />
              <Info label="Proveedor" value={equipment.provider || '-'} />
              <Info label="Teléfono proveedor" value={equipment.providerPhone || '-'} />
              <Info label="Email proveedor" value={equipment.providerEmail || '-'} />
              <Info label="Contacto proveedor" value={equipment.providerContactPerson || '-'} />
              <Info label="Estado" value={equipment.status} />
              <Info label="Clasificación de riesgo" value={equipment.riskClassification || '-'} />
              <Info label="Fabricante" value={equipment.manufacturer || '-'} />
              <Info label="Importador" value={equipment.importer || '-'} />
              <Info label="Tipo" value={equipment.equipmentType || '-'} />
              <Info label="Tecnología" value={equipment.technology || '-'} />
              <Info label="INVIMA" value={equipment.invimaRegistration || '-'} />
              <Info label="Vigencia INVIMA" value={equipment.invimaExpiration || '-'} />
              <Info label="Contrato" value={equipment.contracts?.[0]?.company || '-'} />
              <Info label="Número de contrato" value={equipment.contracts?.[0]?.contractNumber || '-'} />
              <Info label="Tipo de contrato" value={equipment.contracts?.[0]?.contractType || '-'} />
              <Info label="Costo contrato" value={equipment.contracts?.[0]?.cost == null ? '-' : formatCurrency(equipment.contracts?.[0]?.cost)} />
              <Info label="Inicio contrato" value={equipment.contracts?.[0]?.startDate || '-'} />
              <Info label="Fin contrato" value={equipment.contracts?.[0]?.endDate || '-'} />
              <Info label="Renovación automática" value={equipment.contracts?.[0]?.automaticRenewal ? 'Sí' : 'No'} />
              <Info label="Partes incluidas" value={equipment.contracts?.[0]?.withParts ? 'Sí' : 'No'} />
              <Info label="Cobertura" value={equipment.contracts?.[0]?.coverage || '-'} />
              <Info label="Observaciones del contrato" value={equipment.contracts?.[0]?.observations || '-'} />
              <Info label="Control de calidad" value={equipment.qualityControls?.[0]?.controlDate || '-'} />
              <Info label="Próximo control" value={equipment.qualityControls?.[0]?.nextControlDate || '-'} />
              <Info label="Costo control" value={equipment.qualityControls?.[0]?.cost == null ? '-' : formatCurrency(equipment.qualityControls?.[0]?.cost)} />
              <Info label="Licencia / registro" value={equipment.licenses?.[0]?.registrationNumber || '-'} />
              <Info label="Vencimiento licencia" value={equipment.licenses?.[0]?.expirationDate || '-'} />
              <Info label="Última calibración" value={equipment.calibrations?.[0]?.lastCalibrationDate || '-'} />
              <Info label="Próxima calibración" value={equipment.calibrations?.[0]?.nextCalibrationDate || '-'} />
              <Info label="AETitle equipo" value={equipment.dicomConfig?.aeTitle || '-'} />
              <Info label="IP equipo" value={equipment.dicomConfig?.ipAddress || '-'} />
              <Info label="AEtitle RIS" value={equipment.dicomConfig?.risAeTitle || '-'} />
              <Info label="IP RIS" value={equipment.dicomConfig?.risIpAddress || '-'} />
              <Info label="AEtitle PACS" value={equipment.dicomConfig?.pacsAeTitle || '-'} />
              <Info label="IP PACS" value={equipment.dicomConfig?.pacsIpAddress || '-'} />
              <Info label="Puerto equipo" value={equipment.dicomConfig?.port || '-'} />
              <Info label="Puerto RIS" value={equipment.dicomConfig?.risPort || '-'} />
              <Info label="Puerto PACS" value={equipment.dicomConfig?.pacsPort || '-'} />
              <Info label="AniDesk" value={equipment.dicomConfig?.anidesk || '-'} />
              <Info label="Observaciones" value={equipment.observations || '-'} />
            </div>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Archivos adjuntos</h2>
            <form onSubmit={handleDocumentUpload} className="form-grid" style={{ marginBottom: '1rem' }}>
              <div className="form-field"><label>Tipo de documento</label><select className="select" value={documentType} onChange={(e) => setDocumentType(e.target.value)}><option value="CONTRACT">Contrato</option><option value="INVIMA">Registro INVIMA</option><option value="LICENSE">Licencia</option><option value="MAINTENANCE_REPORT">Reporte de mantenimiento</option><option value="QUALITY_CONTROL">Control de calidad</option><option value="SCHEDULE">Cronograma</option><option value="OTHER">Otro</option></select></div>
              <div className="form-field"><label>Fecha de vencimiento</label><input className="input" type="date" value={documentExpiration} onChange={(e) => setDocumentExpiration(e.target.value)} /></div>
              <div className="form-field"><label>Archivo</label><input className="input" type="file" accept="image/*,.pdf,application/pdf" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} required /></div>
              <button className="btn btn-primary" type="submit">Subir documento</button>
            </form>
            {equipment.documents?.length ? (
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {equipment.documents.map((document) => (
                  <div key={document.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => downloadEquipmentDocument(id, document.id, document.fileName)}>{document.documentType} · {document.fileName}</button>
                    <button type="button" className="btn btn-danger" onClick={() => handleDocumentDelete(document.id)}>Eliminar</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No hay documentos adjuntos.</p>
            )}
          </div>
        </>
      )}

      {tab === 'maintenance' && (
        <>
          <div className="card table-wrap">
            <div className="section-heading">
              <div><h2 style={{ marginTop: 0 }}>Historial de mantenimientos</h2><p>{equipment.maintenances.length} registro(s)</p></div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={() => exportRecordsExcel(`mantenimientos-${equipment.id}.xlsx`, maintenanceExportColumns, equipment.maintenances)}><Download size={16} /> Excel global</button>
                <button type="button" className="btn btn-secondary" onClick={() => printRecordsDocument(`Mantenimientos - ${equipment.name}`, maintenanceExportColumns, equipment.maintenances)}><Printer size={16} /> PDF global</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setTab('maintenance'); importInputRef.current?.click(); }}><Upload size={16} /> Importar Excel</button>
              </div>
            </div>
            <div className="maintenance-history-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Programado</th>
                    <th>Empresa</th>
                    <th>Responsable</th>
                    <th>Costo</th>
                    <th>Descripción</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.maintenances.map((item) => (
                    <tr key={item.id}>
                      <td>{item.type}</td>
                      <td>{item.status || 'PENDIENTE'}</td>
                      <td>{item.scheduledDate || '-'}</td>
                      <td>{item.company || '-'}</td>
                      <td>{item.responsible || item.technician?.name || '-'}</td>
                      <td>{item.cost ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(item.cost)) : '-'}</td>
                      <td>{item.description || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" type="button" onClick={() => exportRecordsExcel(`mantenimiento-${item.id}.xlsx`, maintenanceExportColumns, [item])}><Download size={16} /> Excel</button>
                          <button className="btn btn-secondary" type="button" onClick={() => printSingleRecord(`Mantenimiento ${item.id} - ${equipment.name}`, maintenanceExportColumns, item)}><Printer size={16} /> PDF</button>
                          <button className="btn btn-secondary" type="button" onClick={() => { setMaintenanceEditId(item.id); setMaintenanceForm({ ...emptyMaintenance, ...item, cost: item.cost ?? '', scheduledDate: item.scheduledDate ? item.scheduledDate.slice(0, 10) : '' }); }}>Editar</button>
                          <button className="btn btn-danger" type="button" onClick={() => handleMaintenanceDelete(item.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form className="card" onSubmit={handleMaintenanceSubmit}>
            <h2 style={{ marginTop: 0 }}>Registrar mantenimiento</h2>
            <div className="form-grid">
              <div className="form-field">
                <label>Tipo</label>
                <select
                  className="select"
                  value={maintenanceForm.type}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, type: e.target.value })
                  }
                >
                  <option value="PREVENTIVE">Preventivo</option>
                  <option value="CORRECTIVE">Correctivo</option>
                  <option value="CALIBRATION">Calibración</option>
                  <option value="INSPECTION">Inspección</option>
                </select>
              </div>
              <div className="form-field">
                <label>Estado</label>
                <select
                  className="select"
                  value={maintenanceForm.status}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                >
                  <option value="SCHEDULED">Programado</option>
                  <option value="IN_PROGRESS">En ejecución</option>
                  <option value="COMPLETED">Completado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
              <div className="form-field">
                <label>Fecha programada</label>
                <input
                  className="input"
                  type="date"
                  value={maintenanceForm.scheduledDate}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, scheduledDate: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label>Empresa</label>
                <input
                  className="input"
                  value={maintenanceForm.company}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, company: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label>Responsable</label>
                <input
                  className="input"
                  value={maintenanceForm.responsible}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, responsible: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Costo mantenimiento</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1000"
                  value={maintenanceForm.cost}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                />
              </div>
            </div>
            <div className="form-field">
              <label>Descripción</label>
              <textarea
                className="textarea"
                value={maintenanceForm.description}
                onChange={(e) =>
                  setMaintenanceForm({ ...maintenanceForm, description: e.target.value })
                }
              />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>Trabajo realizado</label>
                <textarea
                  className="textarea"
                  value={maintenanceForm.workPerformed}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, workPerformed: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Observaciones</label>
                <textarea
                  className="textarea"
                  value={maintenanceForm.observations}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, observations: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-primary">Guardar mantenimiento</button>
          </form>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Registro Masivo</h2>
            {bulkMaintenanceRows.map((row, index) => (
              <div className="card" key={index}>
                <div className="form-grid">
                  <div className="form-field"><label>Tipo</label><select className="select" value={row.type} onChange={(e) => setBulkMaintenanceRows((all) => all.map((item, i) => i === index ? { ...item, type: e.target.value } : item))}><option value="PREVENTIVE">Preventivo</option><option value="CORRECTIVE">Correctivo</option><option value="CALIBRATION">Calibración</option><option value="INSPECTION">Inspección</option></select></div>
                  <div className="form-field"><label>Estado</label><select className="select" value={row.status} onChange={(e) => setBulkMaintenanceRows((all) => all.map((item, i) => i === index ? { ...item, status: e.target.value } : item))}><option value="SCHEDULED">Programado</option><option value="IN_PROGRESS">En ejecución</option><option value="COMPLETED">Completado</option><option value="CANCELLED">Cancelado</option></select></div>
                  <div className="form-field"><label>Fecha programada</label><input className="input" type="date" value={row.scheduledDate} onChange={(e) => setBulkMaintenanceRows((all) => all.map((item, i) => i === index ? { ...item, scheduledDate: e.target.value } : item))} /></div>
                  <div className="form-field"><label>Empresa</label><input className="input" value={row.company} onChange={(e) => setBulkMaintenanceRows((all) => all.map((item, i) => i === index ? { ...item, company: e.target.value } : item))} /></div>
                  <div className="form-field"><label>Responsable</label><input className="input" value={row.responsible} onChange={(e) => setBulkMaintenanceRows((all) => all.map((item, i) => i === index ? { ...item, responsible: e.target.value } : item))} /></div>
                  <div className="form-field"><label>Costo mantenimiento</label><input className="input" type="number" min="0" step="1000" value={row.cost} onChange={(e) => setBulkMaintenanceRows((all) => all.map((item, i) => i === index ? { ...item, cost: e.target.value } : item))} /></div>
                </div>
                <div className="form-field"><label>Descripción</label><textarea className="textarea" value={row.description} onChange={(e) => setBulkMaintenanceRows((all) => all.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} /></div>
                <div className="form-grid">
                  <div className="form-field"><label>Trabajo realizado</label><textarea className="textarea" value={row.workPerformed} onChange={(e) => setBulkMaintenanceRows((all) => all.map((item, i) => i === index ? { ...item, workPerformed: e.target.value } : item))} /></div>
                  <div className="form-field"><label>Observaciones</label><textarea className="textarea" value={row.observations} onChange={(e) => setBulkMaintenanceRows((all) => all.map((item, i) => i === index ? { ...item, observations: e.target.value } : item))} /></div>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary" type="button" onClick={() => setBulkMaintenanceRows((rows) => [...rows, emptyMaintenance])}>Agregar fila</button>
            <button className="btn btn-primary" type="button" onClick={() => submitBulk('maintenance')}>Guardar mantenimientos</button>
          </div>
        </>
      )}

      {tab === 'incidents' && (
        <>
          <div className="card table-wrap">
            <div className="section-heading">
              <div><h2 style={{ marginTop: 0 }}>Novedades reportadas</h2><p>{equipment.incidents.length} registro(s)</p></div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={() => exportRecordsExcel(`novedades-${equipment.id}.xlsx`, incidentExportColumns, equipment.incidents)}><Download size={16} /> Excel global</button>
                <button type="button" className="btn btn-secondary" onClick={() => printRecordsDocument(`Novedades - ${equipment.name}`, incidentExportColumns, equipment.incidents)}><Printer size={16} /> PDF global</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setTab('incidents'); importInputRef.current?.click(); }}><Upload size={16} /> Importar Excel</button>
              </div>
            </div>
            <div className="maintenance-history-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Reporte 018000</th>
                    <th>Quien reporta</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.incidents.map((item) => (
                    <tr key={item.id}>
                      <td>{item.reportNumber || '-'}</td>
                      <td>{item.reporterName || item.reportedBy?.name || '-'}</td>
                      <td>{item.priority}</td>
                      <td>{item.status}</td>
                      <td>{item.reportedAt ? item.reportedAt.slice(0, 10) : '-'}</td>
                      <td>{item.description}</td>
                      <td>
                        <button className="btn btn-secondary" onClick={() => exportRecordsExcel(`novedad-${item.id}.xlsx`, incidentExportColumns, [item])}><Download size={16} /> Excel</button>
                        <button className="btn btn-secondary" onClick={() => printSingleRecord(`Novedad ${item.id} - ${equipment.name}`, incidentExportColumns, item)}><Printer size={16} /> PDF</button>
                        {item.status !== 'RESOLVED' && item.status !== 'CLOSED' && (
                          <button className="btn btn-secondary" onClick={() => handleIncidentClose(item.id)}>
                            Cerrar
                          </button>
                        )}
                        <button className="btn btn-danger" onClick={() => handleIncidentDelete(item.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form className="card" onSubmit={handleIncidentSubmit}>
            <h2 style={{ marginTop: 0 }}>Registrar novedad</h2>
            <div className="form-grid">
              <div className="form-field">
                <label>Número de reporte 018000</label>
                <input
                  className="input"
                  value={incidentForm.reportNumber}
                  onChange={(e) => setIncidentForm({ ...incidentForm, reportNumber: e.target.value })}
                  placeholder="018000-001"
                />
              </div>
              <div className="form-field">
                <label>Quien reporta</label>
                <input
                  className="input"
                  value={incidentForm.reporterName}
                  onChange={(e) => setIncidentForm({ ...incidentForm, reporterName: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Fecha del reporte</label>
                <input
                  className="input"
                  type="date"
                  value={incidentForm.reportedAt}
                  onChange={(e) => setIncidentForm({ ...incidentForm, reportedAt: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Prioridad</label>
                <select
                  className="select"
                  value={incidentForm.priority}
                  onChange={(e) =>
                    setIncidentForm({ ...incidentForm, priority: e.target.value })
                  }
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>
            </div>
            <div className="form-field">
              <label>Descripción</label>
              <textarea
                className="textarea"
                value={incidentForm.description}
                onChange={(e) =>
                  setIncidentForm({ ...incidentForm, description: e.target.value })
                }
                required
              />
            </div>
            <div className="form-field">
              <label>Observaciones</label>
              <textarea
                className="textarea"
                value={incidentForm.observations}
                onChange={(e) => setIncidentForm({ ...incidentForm, observations: e.target.value })}
              />
            </div>
            <button className="btn btn-primary">Reportar novedad</button>
          </form>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Registro Masivo</h2>
            {bulkIncidentRows.map((row, index) => (
              <div className="card" key={index}>
                <div className="form-grid">
                  <div className="form-field"><label>Número de reporte 018000</label><input className="input" value={row.reportNumber} onChange={(e) => setBulkIncidentRows((all) => all.map((item, i) => i === index ? { ...item, reportNumber: e.target.value } : item))} placeholder="018000-001" /></div>
                  <div className="form-field"><label>Quien reporta</label><input className="input" value={row.reporterName} onChange={(e) => setBulkIncidentRows((all) => all.map((item, i) => i === index ? { ...item, reporterName: e.target.value } : item))} /></div>
                  <div className="form-field"><label>Fecha del reporte</label><input className="input" type="date" value={row.reportedAt} onChange={(e) => setBulkIncidentRows((all) => all.map((item, i) => i === index ? { ...item, reportedAt: e.target.value } : item))} /></div>
                  <div className="form-field"><label>Prioridad</label><select className="select" value={row.priority} onChange={(e) => setBulkIncidentRows((all) => all.map((item, i) => i === index ? { ...item, priority: e.target.value } : item))}><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></div>
                </div>
                <div className="form-field"><label>Descripción</label><textarea className="textarea" value={row.description} onChange={(e) => setBulkIncidentRows((all) => all.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} required /></div>
                <div className="form-field"><label>Observaciones</label><textarea className="textarea" value={row.observations} onChange={(e) => setBulkIncidentRows((all) => all.map((item, i) => i === index ? { ...item, observations: e.target.value } : item))} /></div>
              </div>
            ))}
            <button className="btn btn-secondary" type="button" onClick={() => setBulkIncidentRows((rows) => [...rows, emptyIncident])}>Agregar fila</button>
            <button className="btn btn-primary" type="button" onClick={() => submitBulk('incidents')}>Guardar novedades</button>
          </div>        </>
      )}
      </div>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
      <strong>{label}</strong>
      <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>{value}</p>
    </div>
  );
}
