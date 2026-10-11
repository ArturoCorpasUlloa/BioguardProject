import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileDown, Pencil, Plus, Printer, Trash2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi, equipmentApi, operationsApi } from '../services/api';
import { downloadExcel, downloadExcelTemplate, mapExcelRow, readExcelFile } from '../utils/excel';

const dateText = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
};

const formatCurrency = (value) => {
 const numericValue = Number(value);
 if (!Number.isFinite(numericValue) || numericValue === 0) return '$ 0';
 return new Intl.NumberFormat('es-CO', {
   style: 'currency',
   currency: 'COP',
   maximumFractionDigits: 0,
 }).format(numericValue);
};

const contractPartsText = (item) => {
  if (item.contractType === 'WITH_PARTS') return 'Con partes/repuestos incluidos';
  if (item.contractType === 'LABOR_ONLY') return 'Solo mano de obra';
  if (item.contractType === 'SERVICE_PROVISION') return 'Prestación de servicios';
  if (item.contractType) return item.contractType;
  return item.withParts ? 'Con partes/repuestos incluidos' : 'Sin partes';
};

function printRecordDocument(title, rows) {
 const printWindow = window.open('', '_blank');
 if (!printWindow) return;

 const bodyRows = rows
   .filter(([, value]) => value !== '' && value !== null && value !== undefined)
   .map(([label, value]) => `<tr><th>${label}</th><td>${String(value)}</td></tr>`)
   .join('');

 const html = `<!doctype html>
   <html>
     <head>
       <meta charset="utf-8" />
       <title>${title}</title>
       <style>
         :root { color-scheme: light; }
         * { box-sizing: border-box; }
         body { margin: 0; background: #fff; color: #1f2937; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.45; }
         .sheet { max-width: 920px; margin: 0 auto; }
         .header { background: #1f2a40; color: #fff; min-height: 142px; padding: 30px 42px 26px; text-align: center; }
         h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: .2px; }
         .subtitle { margin: 10px 0 0; color: #c5cfdf; font-size: 13px; }
         .date { margin-top: 14px; color: #e5eaf2; font-size: 11px; }
         .content { padding: 28px 48px 40px; }
         .section-title { margin: 0 0 12px; border-bottom: 2px solid #9aa4b2; padding-bottom: 8px; color: #1f2a40; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
         table { width: 100%; border-collapse: collapse; }
         tr:nth-child(odd) { background: #f5f7fb; }
         th, td { padding: 11px 14px; border-bottom: 1px solid #e4e8ef; text-align: left; vertical-align: top; }
         th { width: 34%; color: #68778a; font-size: 12px; font-weight: 700; }
         td { color: #273142; font-size: 14px; font-weight: 500; }
         @page { size: auto; margin: 12mm; }
         @media print { .sheet { max-width: none; } .header { print-color-adjust: exact; -webkit-print-color-adjust: exact; } tr:nth-child(odd) { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
       </style>
     </head>
     <body>
       <div class="sheet">
         <div class="header">
           <h1>${title}</h1>
           <div class="subtitle">Ficha individual del registro</div>
           <div class="date">Fecha de impresión: ${new Date().toLocaleString('es-CO')}</div>
         </div>
         <main class="content">
           <div class="section-title">Información del registro</div>
           <table>
             <tbody>${bodyRows || '<tr><td colspan="2">Sin información</td></tr>'}</tbody>
           </table>
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
 printWindow.addEventListener('load', () => {
   print();
 }, { once: true });
 setTimeout(() => {
   print();
 }, 500);
}

function printModuleListDocument(title, columns, items) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const headersHtml = columns.map((column) => `<th>${column.label}</th>`).join('');
  const rowsHtml = items.map((item) => `
    <tr>${columns.map((column) => `<td>${String(column.render(item) ?? '-')}</td>`).join('')}</tr>
  `).join('');

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #fff; color: #1f2937; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.4; }
          .sheet { max-width: 1100px; margin: 0 auto; }
          .header { background: #1f2a40; color: #fff; min-height: 142px; padding: 30px 42px 26px; text-align: center; }
          h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: .2px; }
          .subtitle { margin: 10px 0 0; color: #c5cfdf; font-size: 13px; }
          .date { margin-top: 14px; color: #e5eaf2; font-size: 11px; }
          .content { padding: 28px 36px 40px; }
          .section-title { margin: 0 0 12px; border-bottom: 2px solid #9aa4b2; padding-bottom: 8px; color: #1f2a40; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          tr:nth-child(even) { background: #f5f7fb; }
          th, td { padding: 10px 9px; border-bottom: 1px solid #e4e8ef; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
          th { color: #68778a; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
          td { color: #273142; font-size: 12px; font-weight: 500; }
          @page { size: landscape; margin: 10mm; }
          @media print { .sheet { max-width: none; } .header, tr:nth-child(even) { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <h1>${title}</h1>
            <div class="subtitle">Listado de registros</div>
            <div class="date">Fecha de impresión: ${new Date().toLocaleString('es-CO')}</div>
          </div>
          <main class="content">
            <div class="section-title">Información (${items.length})</div>
            <table>
              <thead><tr>${headersHtml}</tr></thead>
              <tbody>${rowsHtml || `<tr><td colspan="${columns.length}">Sin registros</td></tr>`}</tbody>
            </table>
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
  printWindow.addEventListener('load', print, { once: true });
  setTimeout(print, 500);
}

function printReportDocument(title, sections) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const sectionHtml = sections.map((section) => {
    const rowsHtml = section.rows
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .map(([label, value]) => `<tr><th>${label}</th><td>${String(value)}</td></tr>`)
      .join('');

    return `
      <section class="report-section">
        <h2>${section.title}</h2>
        <table><tbody>${rowsHtml || '<tr><td colspan="2">Sin información</td></tr>'}</tbody></table>
      </section>
    `;
  }).join('');

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
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
          .report-section { margin-bottom: 28px; }
          .report-section h2 { margin: 0 0 12px; border-bottom: 2px solid #9aa4b2; padding-bottom: 8px; color: #1f2a40; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
          table { width: 100%; border-collapse: collapse; }
          tr:nth-child(odd) { background: #f5f7fb; }
          th, td { padding: 11px 14px; border-bottom: 1px solid #e4e8ef; text-align: left; vertical-align: top; }
          th { width: 34%; color: #68778a; font-size: 12px; font-weight: 700; }
          td { color: #273142; font-size: 14px; font-weight: 500; }
          @page { size: auto; margin: 12mm; }
          @media print { .sheet { max-width: none; } .header, tr:nth-child(odd) { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <h1>${title}</h1>
            <div class="subtitle">Indicadores operativos y trazabilidad del periodo</div>
            <div class="date">Fecha de impresión: ${new Date().toLocaleString('es-CO')}</div>
          </div>
          <main class="content">${sectionHtml}</main>
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
  printWindow.addEventListener('load', print, { once: true });
  setTimeout(print, 500);
}

function ModuleCrudPage({
  title,
  subtitle,
  loader,
  columns,
  fields,
  emptyForm,
  entityLabel,
  onCreate,
  onUpdate,
  onDelete,
  exportRows,
  printFields,
  equipmentOptions = [],
  showAddButton = true,
  importEnabled = true,
}) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const formRef = useRef(null);
  const importRef = useRef(null);

  async function loadItems() {
    try {
      const data = await loader();
      setItems(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadItems();
  }, [loader]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      if (editingId) {
        await onUpdate(editingId, form);
        setMessage(`${entityLabel} actualizada.`);
      } else {
        await onCreate(form);
        setMessage(`${entityLabel} creada.`);
      }
      setEditingId(null);
      setForm(emptyForm);
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(`¿Eliminar esta ${entityLabel.toLowerCase()}?`)) return;
    try {
      await onDelete(id);
      setMessage(`${entityLabel} eliminada.`);
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    const editForm = { ...emptyForm, ...item };
    fields.forEach((field) => {
      if (field.type === 'date' && editForm[field.name]) {
        editForm[field.name] = String(editForm[field.name]).slice(0, 10);
      }
    });
    setForm(editForm);
    setMessage('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const tableRows = useMemo(() => exportRows(items), [items, exportRows]);
  const exportHeaders = useMemo(() => columns.map((column) => column.label), [columns]);

  function handlePrint(item) {
    const rows = typeof printFields === 'function' ? printFields(item) : columns.map((column) => [column.label, column.render(item)]);
    printRecordDocument(title, rows);
  }

  function handlePrintList() {
    printModuleListDocument(title, columns, items);
  }

  const importHeaders = fields.map((field) => ({ key: field.name, label: field.label }));

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const rows = await readExcelFile(file);
      if (!rows.length) throw new Error('La plantilla no contiene filas para importar.');
      for (const [index, row] of rows.entries()) {
        const data = mapExcelRow(row, importHeaders);
        await onCreate(data);
        if (index === rows.length - 1) setMessage(`${rows.length} registros importados correctamente.`);
      }
      await loadItems();
    } catch (err) {
      setError(`No se pudo importar el archivo: ${err.message}`);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {showAddButton && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setMessage('');
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <Plus size={16} /> {`Agregar ${entityLabel}`}
            </button>
          )}
          {importEnabled && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => downloadExcelTemplate(`${title.toLowerCase().replace(/\s+/g, '-')}-plantilla.xlsx`, importHeaders)}>
                <FileDown size={16} /> Plantilla
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => importRef.current?.click()}>
                <Upload size={16} /> Importar Excel
              </button>
              <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
            </>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => downloadExcel(`${title.toLowerCase().replace(/\s+/g, '-')}.xlsx`, exportHeaders, tableRows)}>
            <Download size={16} /> Descargar XLSX
          </button>
          <button type="button" className="btn btn-secondary" onClick={handlePrintList}>
            <Printer size={16} /> PDF
          </button>
        </div>
      </div>

      {error && <div className="card error-message">{error}</div>}
      {message && <div className="card success-message">{message}</div>}

      <form ref={formRef} className="card" onSubmit={handleSubmit}>
        <h2>{editingId ? `Editar ${entityLabel}` : `Nueva ${entityLabel}`}</h2>
        <div className="form-grid">
          {fields.map((field) => (
            <div className="form-field" key={field.name}>
              <label>{field.label}</label>
              {field.type === 'select' ? (
                <select className="select" value={form[field.name] ?? ''} onChange={(event) => updateField(field.name, event.target.value)}>
                  <option value="">Seleccionar</option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea className="textarea" value={form[field.name] ?? ''} onChange={(event) => updateField(field.name, event.target.value)} />
              ) : field.type === 'checkbox' ? (
                <input type="checkbox" checked={Boolean(form[field.name])} onChange={(event) => updateField(field.name, event.target.checked)} />
              ) : (
                <input className="input" type={field.type || 'text'} value={form[field.name] ?? ''} onChange={(event) => updateField(field.name, event.target.value)} />
              )}
            </div>
          ))}
        </div>
        <button className="btn btn-primary" type="submit">
          {editingId ? 'Actualizar' : 'Guardar'}
        </button>
      </form>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {columns.map((column) => <td key={`${item.id}-${column.key}`}>{column.render(item)}</td>)}
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {item.equipment?.id ? (
                      <Link className="btn btn-secondary" to={`/equipos/${item.equipment.id}`}>
                        Ver equipo
                      </Link>
                    ) : null}
                    <button className="btn btn-secondary" type="button" onClick={() => handlePrint(item)} title="Imprimir PDF"><Printer size={14} /></button>
                    <button className="btn btn-secondary" type="button" onClick={() => handleEdit(item)}><Pencil size={14} /></button>
                    <button className="btn btn-danger" type="button" onClick={() => handleDelete(item.equipmentId || item.equipment?.id || item.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <div className="empty-state">
            No hay registros todavía. Use el formulario superior para crear uno nuevo.
          </div>
        )}
      </div>
    </div>
  );
}

export function LicensesPage() {
  const [equipmentOptions, setEquipmentOptions] = useState([]);

  useEffect(() => {
    equipmentApi.list().then(setEquipmentOptions).catch(() => setEquipmentOptions([]));
  }, []);

  const emptyForm = {
    equipmentId: '',
    licenseType: '',
    registrationNumber: '',
    initialDate: '',
    issueDate: '',
    tramitDate: '',
    expirationDate: '',
    observations: '',
  };

  return (
    <ModuleCrudPage
      title="Licencias"
      subtitle="Relación de licencias y vencimientos por equipo."
      loader={operationsApi.licenses.list}
      entityLabel="licencia"
      equipmentOptions={equipmentOptions}
      emptyForm={emptyForm}
      showAddButton={false}
      fields={[
        { name: 'equipmentId', label: 'Equipo', type: 'select', options: equipmentOptions.map((item) => ({ value: item.id, label: item.name })) },
        { name: 'licenseType', label: 'Tipo', type: 'text' },
        { name: 'registrationNumber', label: 'Número de registro', type: 'text' },
        { name: 'initialDate', label: 'Fecha inicial', type: 'date' },
        { name: 'issueDate', label: 'Fecha de emisión', type: 'date' },
        { name: 'tramitDate', label: 'Fecha de trámite', type: 'date' },
        { name: 'expirationDate', label: 'Fecha de vencimiento', type: 'date' },
        { name: 'observations', label: 'Observaciones', type: 'textarea' },
      ]}
      columns={[
        { key: 'equipment', label: 'Equipo', render: (item) => item.equipment?.name || '-' },
        { key: 'type', label: 'Tipo', render: (item) => item.licenseType || '-' },
        { key: 'number', label: 'Registro', render: (item) => item.registrationNumber || '-' },
        { key: 'initialDate', label: 'Inicial', render: (item) => dateText(item.initialDate) },
        { key: 'tramitDate', label: 'Trámite', render: (item) => dateText(item.tramitDate) },
        { key: 'expiration', label: 'Vencimiento', render: (item) => dateText(item.expirationDate) },
      ]}
      onCreate={(data) => operationsApi.licenses.create(data)}
      onUpdate={(id, data) => operationsApi.licenses.update(id, data)}
      onDelete={(id) => operationsApi.licenses.remove(id)}
      exportRows={(items) => items.map((item) => [item.equipment?.name || '', item.licenseType || '', item.registrationNumber || '', dateText(item.initialDate), dateText(item.tramitDate), dateText(item.expirationDate)])}
    />
  );
}

export function ContractsPage() {
  const [equipmentOptions, setEquipmentOptions] = useState([]);

  useEffect(() => {
    equipmentApi.list().then(setEquipmentOptions).catch(() => setEquipmentOptions([]));
  }, []);

  const emptyForm = {
    equipmentId: '',
    contractNumber: '',
    company: '',
    contractType: '',
    startDate: '',
    endDate: '',
    automaticRenewal: false,
    cost: '',
    coverage: '',
    observations: '',
  };

  return (
    <ModuleCrudPage
      title="Contratos"
      subtitle="Contratos de mantenimiento y cobertura por equipo."
      loader={operationsApi.contracts.list}
      entityLabel="contrato"
      equipmentOptions={equipmentOptions}
      emptyForm={emptyForm}
      showAddButton
      fields={[
        { name: 'equipmentId', label: 'Equipo', type: 'select', options: equipmentOptions.map((item) => ({ value: item.id, label: item.name })) },
        { name: 'contractNumber', label: 'Número de contrato', type: 'text' },
        { name: 'company', label: 'Empresa', type: 'text' },
        { name: 'contractType', label: 'Tipo de contrato', type: 'select', options: [
          { value: 'WITH_PARTS', label: 'Con partes/repuestos incluidos' },
          { value: 'LABOR_ONLY', label: 'Solo mano de obra' },
          { value: 'SERVICE_PROVISION', label: 'Prestación de servicios' },
        ] },
        { name: 'startDate', label: 'Fecha inicial', type: 'date' },
        { name: 'endDate', label: 'Fecha final', type: 'date' },
        { name: 'automaticRenewal', label: 'Renovación automática', type: 'checkbox' },
        { name: 'cost', label: 'Costo', type: 'number' },
        { name: 'coverage', label: 'Cobertura', type: 'textarea' },
        { name: 'observations', label: 'Observaciones', type: 'textarea' },
      ]}
      columns={[
        { key: 'equipment', label: 'Equipo', render: (item) => item.equipment?.name || '-' },
        { key: 'company', label: 'Empresa', render: (item) => item.company || '-' },
        { key: 'number', label: 'Número', render: (item) => item.contractNumber || '-' },
        { key: 'start', label: 'Inicio', render: (item) => dateText(item.startDate) },
        { key: 'end', label: 'Fin', render: (item) => dateText(item.endDate) },
        { key: 'renewal', label: 'Auto-renovación', render: (item) => item.automaticRenewal ? 'Sí' : 'No' },
        { key: 'parts', label: 'Partes / repuestos', render: contractPartsText },
        { key: 'cost', label: 'Costo', render: (item) => (item.cost == null || item.cost === '' ? '-' : formatCurrency(item.cost)) },
      ]}
      onCreate={(data) => {
        const contractData = { ...data };
        delete contractData.withParts;
        return operationsApi.contracts.create({ ...contractData, automaticRenewal: Boolean(data.automaticRenewal), cost: data.cost === '' ? null : Number(data.cost) });
      }}
      onUpdate={(id, data) => {
        const contractData = { ...data };
        delete contractData.withParts;
        return operationsApi.contracts.update(id, { ...contractData, automaticRenewal: Boolean(data.automaticRenewal), cost: data.cost === '' ? null : Number(data.cost) });
      }}
      onDelete={(id) => operationsApi.contracts.remove(id)}
      exportRows={(items) => items.map((item) => [item.equipment?.name || '', item.company || '', item.contractNumber || '', dateText(item.startDate), dateText(item.endDate), item.automaticRenewal ? 'Sí' : 'No', contractPartsText(item), item.cost == null || item.cost === '' ? '' : String(item.cost)])}
      printFields={(item) => [
        ['Equipo', item.equipment?.name || '-'],
        ['Empresa', item.company || '-'],
        ['Número', item.contractNumber || '-'],
        ['Tipo', item.contractType || '-'],
        ['Fecha inicial', dateText(item.startDate)],
        ['Fecha final', dateText(item.endDate)],
        ['Renovación automática', item.automaticRenewal ? 'Sí' : 'No'],
        ['Partes / repuestos', contractPartsText(item)],
        ['Costo', item.cost == null || item.cost === '' ? '-' : formatCurrency(item.cost)],
        ['Cobertura', item.coverage || '-'],
        ['Observaciones', item.observations || '-'],
      ]}
    />
  );
}

export function QualityPage() {
  const [equipmentOptions, setEquipmentOptions] = useState([]);

  useEffect(() => {
    equipmentApi.list().then(setEquipmentOptions).catch(() => setEquipmentOptions([]));
  }, []);

  const emptyForm = {
    equipmentId: '',
    controlDate: '',
    nextControlDate: '',
    result: '',
    responsible: '',
    cost: '',
    observations: '',
  };

  return (
    <ModuleCrudPage
      title="Controles de calidad"
      subtitle="Últimos y próximos controles por equipo."
      loader={operationsApi.qualityControls.list}
      entityLabel="control de calidad"
      equipmentOptions={equipmentOptions}
      emptyForm={emptyForm}
      showAddButton={false}
      fields={[
        { name: 'equipmentId', label: 'Equipo', type: 'select', options: equipmentOptions.map((item) => ({ value: item.id, label: item.name })) },
        { name: 'controlDate', label: 'Fecha del control', type: 'date' },
        { name: 'nextControlDate', label: 'Próximo control', type: 'date' },
        { name: 'result', label: 'Resultado', type: 'text' },
        { name: 'responsible', label: 'Responsable', type: 'text' },
        { name: 'cost', label: 'Costo', type: 'number' },
        { name: 'observations', label: 'Observaciones', type: 'textarea' },
      ]}
      columns={[
        { key: 'equipment', label: 'Equipo', render: (item) => item.equipment?.name || '-' },
        { key: 'last', label: 'Último control', render: (item) => dateText(item.controlDate) },
        { key: 'next', label: 'Próximo control', render: (item) => dateText(item.nextControlDate) },
        { key: 'result', label: 'Resultado', render: (item) => item.result || '-' },
        { key: 'responsible', label: 'Responsable', render: (item) => item.responsible || '-' },
        { key: 'cost', label: 'Costo', render: (item) => (item.cost == null || item.cost === '' ? '-' : formatCurrency(item.cost)) },
      ]}
      onCreate={(data) => operationsApi.qualityControls.create({ ...data, cost: data.cost === '' ? null : Number(data.cost) })}
      onUpdate={(id, data) => operationsApi.qualityControls.update(id, { ...data, cost: data.cost === '' ? null : Number(data.cost) })}
      onDelete={(id) => operationsApi.qualityControls.remove(id)}
      exportRows={(items) => items.map((item) => [item.equipment?.name || '', dateText(item.controlDate), dateText(item.nextControlDate), item.result || '', item.responsible || '', item.cost == null || item.cost === '' ? '' : String(item.cost)])}
      printFields={(item) => [
        ['Equipo', item.equipment?.name || '-'],
        ['Último control', dateText(item.controlDate)],
        ['Próximo control', dateText(item.nextControlDate)],
        ['Resultado', item.result || '-'],
        ['Responsable', item.responsible || '-'],
        ['Costo', item.cost == null || item.cost === '' ? '-' : formatCurrency(item.cost)],
        ['Observaciones', item.observations || '-'],
      ]}
    />
  );
}

export function DicomPage() {
  const [equipmentOptions, setEquipmentOptions] = useState([]);

  useEffect(() => {
    equipmentApi.list().then(setEquipmentOptions).catch(() => setEquipmentOptions([]));
  }, []);

  const emptyForm = {
    equipmentId: '',
    aeTitle: '',
    risAeTitle: '',
    pacsAeTitle: '',
    ipAddress: '',
    risIpAddress: '',
    pacsIpAddress: '',
    port: '',
    risPort: '',
    pacsPort: '',
    anidesk: '',
    username: '',
    password: '',
    observations: '',
  };

  return (
    <ModuleCrudPage
      title="AETitle / IP / RIS / PACS"
      subtitle="Configuración de red y accesos por equipo."
      loader={operationsApi.dicom.list}
      entityLabel="configuración DICOM"
      equipmentOptions={equipmentOptions}
      emptyForm={emptyForm}
      showAddButton={false}
      fields={[
        { name: 'equipmentId', label: 'Equipo', type: 'select', options: equipmentOptions.map((item) => ({ value: item.id, label: item.name })) },
        { name: 'aeTitle', label: 'AEtitle del equipo', type: 'text' },
        { name: 'risAeTitle', label: 'AEtitle de RIS', type: 'text' },
        { name: 'pacsAeTitle', label: 'AEtitle de PACS', type: 'text' },
        { name: 'ipAddress', label: 'IP del equipo', type: 'text' },
        { name: 'risIpAddress', label: 'IP de RIS', type: 'text' },
        { name: 'pacsIpAddress', label: 'IP de PACS', type: 'text' },
        { name: 'port', label: 'Puerto del equipo', type: 'number' },
        { name: 'risPort', label: 'Puerto de RIS', type: 'number' },
        { name: 'pacsPort', label: 'Puerto de PACS', type: 'number' },
        { name: 'anidesk', label: 'Anidesk', type: 'text' },
        { name: 'username', label: 'Usuario', type: 'text' },
        { name: 'password', label: 'Clave', type: 'password' },
        { name: 'observations', label: 'Observaciones', type: 'textarea' },
      ]}
      columns={[
        { key: 'equipment', label: 'Equipo', render: (item) => item.equipment?.name || '-' },
        { key: 'aetitle', label: 'AEtitle', render: (item) => item.aeTitle || '-' },
        { key: 'ris', label: 'RIS', render: (item) => `${item.risAeTitle || '-'} / ${item.risIpAddress || '-'}:${item.risPort || '-'}` },
        { key: 'pacs', label: 'PACS', render: (item) => `${item.pacsAeTitle || '-'} / ${item.pacsIpAddress || '-'}:${item.pacsPort || '-'}` },
        { key: 'anidesk', label: 'AniDesk', render: (item) => item.anidesk || '-' },
      ]}
      onCreate={(data) => operationsApi.dicom.save({
        equipmentId: data.equipmentId,
        aeTitle: data.aeTitle,
        risAeTitle: data.risAeTitle,
        pacsAeTitle: data.pacsAeTitle,
        ipAddress: data.ipAddress,
        risIpAddress: data.risIpAddress,
        pacsIpAddress: data.pacsIpAddress,
        port: data.port ? Number(data.port) : null,
        risPort: data.risPort ? Number(data.risPort) : null,
        pacsPort: data.pacsPort ? Number(data.pacsPort) : null,
        anidesk: data.anidesk,
        username: data.username,
        password: data.password,
        observations: data.observations,
      })}
      onUpdate={(id, data) => operationsApi.dicom.save({
        equipmentId: data.equipmentId || id,
        aeTitle: data.aeTitle,
        risAeTitle: data.risAeTitle,
        pacsAeTitle: data.pacsAeTitle,
        ipAddress: data.ipAddress,
        risIpAddress: data.risIpAddress,
        pacsIpAddress: data.pacsIpAddress,
        port: data.port ? Number(data.port) : null,
        risPort: data.risPort ? Number(data.risPort) : null,
        pacsPort: data.pacsPort ? Number(data.pacsPort) : null,
        anidesk: data.anidesk,
        username: data.username,
        password: data.password,
        observations: data.observations,
      })}
      onDelete={(equipmentId) => operationsApi.dicom.remove(equipmentId)}
      exportRows={(items) => items.map((item) => [item.equipment?.name || '', item.aeTitle || '', item.risAeTitle || '', item.risIpAddress || '', item.risPort || '', item.pacsAeTitle || '', item.pacsIpAddress || '', item.pacsPort || ''])}
    />
  );
}

export function ReportsPage() {
  const localMonthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = (value) => {
    if (!value) return '';
    const [year, monthNumber] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
  };
  const [month, setMonth] = useState(localMonthKey());
  const [reportType, setReportType] = useState('month');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      dashboardApi.get(),
      equipmentApi.list(),
      operationsApi.maintenance.list(),
      operationsApi.incidents.list(),
      operationsApi.schedule.list({ year: new Date().getFullYear() }),
    ])
      .then(([dashboard, equipment, maintenance, incidents, schedule]) => {
        setReport({ dashboard, equipment, maintenance, incidents, schedule });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!report) return undefined;
    const year = reportType === 'year' ? month.slice(0, 4) : month.slice(0, 4);
    operationsApi.schedule.list({ year })
      .then((schedule) => setReport((current) => ({ ...current, schedule })))
      .catch((err) => setError(err.message));
    return undefined;
  }, [month, reportType]);

  function isInPeriod(date) {
    if (!date) return false;
    return reportType === 'year'
      ? String(date).slice(0, 4) === month.slice(0, 4)
      : String(date).slice(0, 7) === month;
  }

  function getMonthlyData() {
    if (!report) return null;
    const periodMaintenance = report.maintenance
      .filter((item) => isInPeriod(item.scheduledDate || item.executionDate))
      .filter((item) => ['COMPLETED', 'EXECUTED'].includes(item.status));
    const maintenanceKeys = new Set(periodMaintenance.map((item) => (
      `${item.equipmentId}|${item.type}|${String(item.scheduledDate || item.executionDate).slice(0, 10)}`
    )));

    const scheduleMaintenance = (report.schedule || [])
      .filter((item) => item.status === 'EXECUTED')
      .filter((item) => isInPeriod(item.rescheduledDate || item.scheduledDate))
      .filter((item) => !maintenanceKeys.has(`${item.equipmentId}|${item.maintenanceType}|${String(item.rescheduledDate || item.scheduledDate).slice(0, 10)}`))
      .map((item) => ({
        ...item,
        type: item.type || item.maintenanceType,
        scheduledDate: item.rescheduledDate || item.scheduledDate,
        cost: item.cost || 0,
      }));

    return {
      equipment: report.equipment,
      maintenance: [...periodMaintenance, ...scheduleMaintenance],
      incidents: report.incidents.filter((item) => isInPeriod(item.reportedAt)),
    };
  }

  function downloadCsv() {
    const data = getMonthlyData();
    if (!data) return;

    const rows = [
      [`BioGuard - Reporte ${reportType === 'year' ? 'anual' : 'mensual'}`, periodLabel],
      [],
      ['Indicador', 'Valor'],
      ['Equipos totales', report.dashboard.totals.equipment],
      ['Equipos activos', report.dashboard.totals.activeEquipment],
      [`Mantenimientos del ${reportType === 'year' ? 'año' : 'mes'}`, data.maintenance.length],
      [`Novedades del ${reportType === 'year' ? 'año' : 'mes'}`, data.incidents.length],
      [],
      ['Mantenimientos', 'Equipo', 'Tipo', 'Estado', 'Fecha'],
      ...data.maintenance.map((item) => [
        '',
        item.equipment?.name || '',
        item.type,
        item.status,
        item.scheduledDate || item.executionDate || '',
      ]),
      [],
      ['Novedades', 'Equipo', 'Prioridad', 'Estado', 'Fecha', 'Descripción'],
      ...data.incidents.map((item) => [
        '',
        item.equipment?.name || '',
        item.priority,
        item.status,
        item.reportedAt || '',
        item.description || '',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bioguard-reporte-${reportType}-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="card">Cargando reporte...</div>;
  if (error) return <div className="card">{error}</div>;

  const data = getMonthlyData();
  const periodLabel = reportType === 'year' ? `Año ${month.slice(0, 4)}` : monthLabel(month);
  const completedMaintenance = data.maintenance.filter((item) => ['COMPLETED', 'EXECUTED'].includes(item.status)).length;
  const criticalIncidents = data.incidents.filter((item) => ['HIGH', 'CRITICAL'].includes(item.priority)).length;
  const resolvedIncidents = data.incidents.filter((item) => item.status === 'CLOSED' || item.status === 'RESOLVED').length;
  const totalCost = data.maintenance.reduce((total, item) => total + (Number(item.cost) || 0), 0);
  const maintenanceByType = ['PREVENTIVE', 'CORRECTIVE', 'CALIBRATION', 'INSPECTION'].map((type) => ({
    type,
    label: { PREVENTIVE: 'Preventivo', CORRECTIVE: 'Correctivo', CALIBRATION: 'Calibración', INSPECTION: 'Inspección' }[type],
    count: data.maintenance.filter((item) => item.type === type).length,
  }));
  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  const incidentsByEquipment = data.equipment.map((item) => ({
    ...item,
    incidentCount: data.incidents.filter((incident) => incident.equipmentId === item.id).length,
    maintenanceCount: data.maintenance.filter((maintenance) => maintenance.equipmentId === item.id).length,
    maintenanceCost: data.maintenance
      .filter((maintenance) => maintenance.equipmentId === item.id)
      .reduce((total, maintenance) => total + (Number(maintenance.cost) || 0), 0),
  })).sort((a, b) => b.incidentCount - a.incidentCount);

  function printManagementReport() {
    const maintenanceRows = data.maintenance.map((item, index) => [
      `Mantenimiento ${index + 1}`,
      `${item.equipment?.name || '-'} · ${item.type || '-'} · ${item.status || '-'} · ${dateText(item.scheduledDate || item.executionDate)} · ${formatCurrency(Number(item.cost) || 0)}`,
    ]);
    const incidentRows = data.incidents.map((item, index) => [
      `Novedad ${index + 1}`,
      `${item.equipment?.name || '-'} · ${item.priority || '-'} · ${item.status || '-'} · ${item.description || 'Sin descripción'}`,
    ]);

    printReportDocument(`Reporte gerencial - ${periodLabel}`, [
      {
        title: 'Resumen ejecutivo',
        rows: [
          ['Periodo', periodLabel],
          ['Equipos activos', `${report.dashboard.totals.activeEquipment} de ${data.equipment.length} registrados`],
          ['Mantenimientos', `${data.maintenance.length} (${completedMaintenance} completados)`],
          ['Novedades', `${data.incidents.length} (${resolvedIncidents} resueltas)`],
          ['Incidentes de alta prioridad', criticalIncidents],
          [`Costo total del ${reportType === 'year' ? 'año' : 'mes'}`, formatCurrency(totalCost)],
        ],
      },
      {
        title: 'Detalle de mantenimientos',
        rows: maintenanceRows,
      },
      {
        title: 'Detalle de novedades',
        rows: incidentRows,
      },
      {
        title: 'Novedades por equipo',
        rows: incidentsByEquipment.map((item) => [
          item.name,
          `${item.incidentCount} novedad(es) · ${item.maintenanceCount} mantenimiento(s) · ${formatCurrency(item.maintenanceCost)}`,
        ]),
      },
    ]);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Reportes para gerencia</h1>
          <p>Indicadores operativos y trazabilidad para gerencia.</p>
        </div>
        <div className="report-actions">
          <button className="btn btn-primary" onClick={downloadCsv}><Download size={16} /> Exportar CSV</button>
          <button className="btn btn-secondary" onClick={printManagementReport}><Printer size={16} /> Imprimir / PDF</button>
        </div>
      </div>

      <div className="card report-toolbar">
        <div>
          <span className="eyebrow">Periodo del informe</span>
          <h2>Reporte {reportType === 'year' ? 'anual' : 'mensual'}</h2>
        </div>
        <div className="form-field">
          <label>Tipo de reporte</label>
          <select className="select" value={reportType} onChange={(event) => {
            const nextType = event.target.value;
            setReportType(nextType);
            if (nextType === 'year') setMonth(month.slice(0, 4));
            else if (!month.includes('-')) setMonth(`${month}-01`);
          }}>
            <option value="month">Mensual</option>
            <option value="year">Anual</option>
          </select>
        </div>
        <div className="form-field">
          <label>{reportType === 'year' ? 'Año del reporte' : 'Mes del reporte'}</label>
          <input className="input" type={reportType === 'year' ? 'number' : 'month'} value={reportType === 'year' ? month.slice(0, 4) : month} onChange={(event) => setMonth(event.target.value)} min={reportType === 'year' ? '2000' : undefined} max={reportType === 'year' ? '2100' : undefined} />
        </div>
        <span className="report-period">{periodLabel}</span>
      </div>

      <div className="report-stats">
        <div className="report-stat"><span>Equipos activos</span><strong>{report.dashboard.totals.activeEquipment}</strong><small>de {data.equipment.length} registrados</small></div>
        <div className="report-stat"><span>Mantenimientos</span><strong>{data.maintenance.length}</strong><small>{completedMaintenance} completados</small></div>
        <div className="report-stat"><span>Novedades</span><strong>{data.incidents.length}</strong><small>{resolvedIncidents} resueltas</small></div>
        <div className="report-stat"><span>Costo del periodo</span><strong>{formatCurrency(totalCost)}</strong><small>mantenimientos registrados</small></div>
      </div>

      <div className="report-grid">
        <section className="card report-panel">
          <div className="panel-heading"><div><h2>Mantenimientos del periodo</h2><p>Distribución por tipo de actividad.</p></div><span className="panel-total">{data.maintenance.length}</span></div>
          {maintenanceByType.map((item) => (
            <div className="report-bar-row" key={item.type}>
              <div><span>{item.label}</span><strong>{item.count}</strong></div>
              <div className="report-bar"><span style={{ width: `${data.maintenance.length ? (item.count / data.maintenance.length) * 100 : 0}%` }} /></div>
            </div>
          ))}
          {!data.maintenance.length && <div className="empty-state">Sin mantenimientos en este periodo.</div>}
        </section>
        <section className="card report-panel">
          <div className="panel-heading"><div><h2>Novedades del periodo</h2><p>Prioridad y seguimiento de incidentes.</p></div><span className="panel-total">{criticalIncidents}</span></div>
          <div className="incident-summary"><div><strong>{criticalIncidents}</strong><span>Alta / crítica</span></div><div><strong>{resolvedIncidents}</strong><span>Resueltas</span></div><div><strong>{data.incidents.length - resolvedIncidents}</strong><span>Abiertas</span></div></div>
          {data.incidents.slice(0, 5).map((item) => <div className="report-list-item" key={item.id}><div><Link to={`/equipos/${item.equipmentId}`}><strong>{item.equipment?.name || 'Equipo'}</strong></Link><span>{item.description || 'Sin descripción'}</span></div><em className={`priority-${String(item.priority).toLowerCase()}`}>{item.priority}</em></div>)}
          {!data.incidents.length && <div className="empty-state">Sin novedades en este periodo.</div>}
        </section>
      </div>

      <section className="card report-panel report-table-panel">
        <div className="panel-heading"><div><h2>Novedades por equipo</h2><p>Indicador de novedades registradas en {periodLabel}.</p></div></div>
        <div className="report-stats">
          {incidentsByEquipment.map((item) => (
            <Link className="report-stat" key={item.id} to={`/equipos/${item.id}`}>
              <span>{item.name}</span>
              <strong>{item.incidentCount} nov. · {item.maintenanceCount} mant.</strong>
              <small>{formatCurrency(item.maintenanceCost)} en costos</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="card report-panel report-table-panel">
        <div className="panel-heading"><div><h2>Detalle de actividades</h2><p>Registro de mantenimientos programados y ejecutados.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Equipo</th><th>Tipo</th><th>Estado</th><th>Fecha</th><th>Costo</th></tr></thead>
            <tbody>{data.maintenance.map((item) => <tr key={item.id}><td><Link to={`/equipos/${item.equipmentId}`}><strong>{item.equipment?.name || '-'}</strong></Link><small>{item.equipment?.area?.name || 'Sin área'}</small></td><td>{item.type}</td><td><span className="badge badge-info">{item.status}</span></td><td>{item.scheduledDate || item.executionDate || '-'}</td><td>{formatCurrency(Number(item.cost) || 0)}</td></tr>)}</tbody>
          </table>
        </div>
        {!data.maintenance.length && <div className="empty-state">No hay actividades registradas.</div>}
      </section>
    </div>
  );
}
