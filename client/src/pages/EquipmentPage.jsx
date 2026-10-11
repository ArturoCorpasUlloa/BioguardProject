import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileDown, Pencil, Plus, Printer, Search, Trash2, Upload } from 'lucide-react';
import { areasApi, equipmentApi } from '../services/api';
import { downloadExcel, downloadExcelTemplate, mapExcelRow, readExcelFile } from '../utils/excel';

const equipmentImportHeaders = [
  ['name', 'Nombre'], ['brand', 'Marca'], ['model', 'Modelo'], ['serialNumber', 'Número de serie'],
  ['inventoryCode', 'Código de inventario'], ['areaId', 'ID del área'], ['location', 'Ubicación'],
  ['status', 'Estado'], ['riskClassification', 'Clasificación de riesgo'], ['manufacturer', 'Fabricante'],
  ['importer', 'Importador'], ['manufacturingYear', 'Año de fabricación'], ['provider', 'Proveedor'],
  ['technicalResponsible', 'Responsable técnico'], ['maintenanceFrequency', 'Frecuencia de mantenimiento'],
  ['equipmentType', 'Tipo de equipo'], ['technology', 'Tecnología'], ['powerSupply', 'Fuente de alimentación'],
  ['voltage', 'Voltaje'], ['power', 'Potencia'], ['invimaRegistration', 'Registro INVIMA'],
  ['observations', 'Observaciones'],
  ['acquisitionDate', 'Fecha de adquisición'], ['warrantyExpiration', 'Vencimiento de garantía'],
  ['installationDate', 'Fecha de instalación'], ['usefulLifeYears', 'Vida útil (años)'],
  ['invimaExpiration', 'Vencimiento INVIMA'], ['photoPath', 'Ruta de la foto'],
  ['contractStartDate', 'Inicio del contrato'], ['contractEndDate', 'Fin del contrato'],
  ['contractCompany', 'Empresa del contrato'], ['contractCost', 'Costo del contrato'],
  ['contractAutomaticRenewal', 'Renovación automática del contrato'], ['contractWithParts', 'Contrato con repuestos'],
  ['qualityControlDate', 'Fecha del control de calidad'], ['qualityNextControlDate', 'Próximo control de calidad'],
  ['qualityCost', 'Costo del control de calidad'], ['lastCalibrationDate', 'Última calibración'],
  ['nextCalibrationDate', 'Próxima calibración'], ['licenseRegistrationNumber', 'Número de registro de licencia'],
  ['licenseInitialDate', 'Fecha inicial de licencia'], ['licenseTramitDate', 'Fecha de trámite de licencia'],
  ['licenseExpirationDate', 'Vencimiento de licencia'], ['dicomAeTitle', 'AE Title del equipo'],
  ['risAeTitle', 'AE Title de RIS'], ['dicomPacsAeTitle', 'AE Title de PACS'],
  ['dicomIpAddress', 'IP del equipo'], ['risIpAddress', 'IP de RIS'], ['pacsIpAddress', 'IP de PACS'],
  ['dicomPort', 'Puerto del equipo'], ['risPort', 'Puerto de RIS'], ['pacsPort', 'Puerto de PACS'],
  ['anidesk', 'AniDesk'], ['dicomUsername', 'Usuario DICOM'], ['anideskPassword', 'Clave DICOM'],
  ['dicomObservations', 'Observaciones DICOM'],
];

function printEquipmentList(items) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rows = items.map((item, index) => [
    `Equipo ${index + 1}`,
    `${item.name || '-'} · ${item.brand || '-'} ${item.model || ''}`.trim(),
    `${item.serialNumber || '-'} / ${item.inventoryCode || '-'}`,
    `${item.area?.name || '-'} · ${item.location || '-'}`,
    item.status || '-',
  ]);
  const bodyRows = rows
    .map(([label, name, identifier, location, status]) => `
      <tr>
        <th>${label}</th>
        <td><strong>${name}</strong><br><span>${identifier}</span><br><span>${location}</span><br><b>${status}</b></td>
      </tr>
    `)
    .join('');
  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Equipos biomédicos</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #fff; color: #1f2937; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.45; }
          .sheet { max-width: 920px; margin: 0 auto; }
          .header { background: #1f2a40; color: #fff; min-height: 158px; padding: 32px 42px 26px; text-align: center; }
          h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .subtitle { margin: 10px 0 0; color: #c5cfdf; font-size: 13px; }
          .date { margin-top: 14px; color: #e5eaf2; font-size: 11px; }
          .content { padding: 28px 48px 40px; }
          .section-title { margin: 0 0 12px; border-bottom: 2px solid #9aa4b2; padding-bottom: 8px; color: #1f2a40; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
          table { width: 100%; border-collapse: collapse; }
          tr:nth-child(odd) { background: #f5f7fb; }
          th, td { padding: 11px 14px; border-bottom: 1px solid #e4e8ef; text-align: left; vertical-align: top; }
          th { width: 20%; color: #68778a; font-size: 12px; font-weight: 700; }
          td { color: #273142; font-size: 14px; }
          td span { color: #68778a; font-size: 12px; }
          td b { color: #1f766e; font-size: 12px; }
          @page { size: auto; margin: 12mm; }
          @media print { .sheet { max-width: none; } .header, tr:nth-child(odd) { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <h1>Equipos biomédicos</h1>
            <div class="subtitle">Listado de equipos registrados y su ubicación</div>
            <div class="date">Fecha de impresión: ${new Date().toLocaleString('es-CO')}</div>
          </div>
          <main class="content">
            <div class="section-title">Información de equipos (${items.length})</div>
            <table><tbody>${bodyRows || '<tr><td colspan="2">Sin equipos registrados</td></tr>'}</tbody></table>
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

export default function EquipmentPage() {
  const [items, setItems] = useState([]);
  const [areas, setAreas] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', areaId: '' });
  const [error, setError] = useState('');
  const importRef = useRef(null);

  useEffect(() => {
    areasApi.list().then(setAreas).catch(() => {});
  }, []);

  useEffect(() => {
    equipmentApi
      .list({
        search: filters.search || undefined,
        status: filters.status || undefined,
        areaId: filters.areaId || undefined,
      })
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [filters]);

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const rows = await readExcelFile(file);
      if (!rows.length) throw new Error('La plantilla no contiene filas para importar.');
      for (const row of rows) {
        const data = mapExcelRow(row, equipmentImportHeaders);
        data.areaId = data.areaId === '' ? null : Number(data.areaId);
        data.manufacturingYear = data.manufacturingYear === '' ? null : Number(data.manufacturingYear);
        data.usefulLifeYears = data.usefulLifeYears === '' ? null : Number(data.usefulLifeYears);
        data.contract = {
          startDate: data.contractStartDate || null,
          endDate: data.contractEndDate || null,
          company: data.contractCompany || null,
          cost: data.contractCost === '' ? null : Number(data.contractCost),
        };
        data.license = {
          registrationNumber: data.licenseRegistrationNumber || null,
          expirationDate: data.licenseExpirationDate || null,
        };
        data.qualityControl = {
          controlDate: data.qualityControlDate || null,
          nextControlDate: data.qualityNextControlDate || null,
          cost: data.qualityCost === '' ? null : Number(data.qualityCost),
        };
        data.calibration = {
          lastCalibrationDate: data.lastCalibrationDate || null,
          nextCalibrationDate: data.nextCalibrationDate || null,
        };
        data.dicom = {
          aeTitle: data.dicomAeTitle || null,
          risAeTitle: data.risAeTitle || null,
          pacsAeTitle: data.dicomPacsAeTitle || null,
          ipAddress: data.dicomIpAddress || null,
          risIpAddress: data.risIpAddress || null,
          pacsIpAddress: data.pacsIpAddress || null,
          port: data.dicomPort === '' ? null : Number(data.dicomPort),
          risPort: data.risPort === '' ? null : Number(data.risPort),
          pacsPort: data.pacsPort === '' ? null : Number(data.pacsPort),
          anidesk: data.anidesk || null,
          username: data.dicomUsername || null,
          password: data.anideskPassword || null,
          observations: data.dicomObservations || null,
        };
        await equipmentApi.create(data);
      }

      const refreshed = await equipmentApi.list({
        search: filters.search || undefined,
        status: filters.status || undefined,
        areaId: filters.areaId || undefined,
      });
      setItems(refreshed);
      setError('');
    } catch (err) {
      setError(`No se pudo importar el archivo: ${err.message}`);
    }
  }

      async function handleDelete(id) {
        if (!window.confirm('¿Eliminar esta hoja de vida? Esta acción también eliminará sus registros relacionados.')) return;
        try {
          await equipmentApi.remove(id);
          setItems((current) => current.filter((item) => item.id !== id));
          setError('');
        } catch (err) {
          setError(`No se pudo eliminar la hoja de vida: ${err.message}`);
        }
      }

      async function printEquipmentSheet(item) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        try {
          const equipment = await equipmentApi.get(item.id);
          const contract = equipment.contracts?.[0];
          const rows = [
            ['Equipo', equipment.name],
            ['Marca / Modelo', `${equipment.brand || '-'} ${equipment.model || ''}`.trim()],
            ['Serial / Inventario', `${equipment.serialNumber || '-'} / ${equipment.inventoryCode || '-'}`],
            ['Área', equipment.area?.name || '-'],
            ['Ubicación', equipment.location || '-'],
            ['Estado', equipment.status || '-'],
            ['Modalidad', equipment.modality || '-'],
            ['Proveedor', equipment.provider || '-'],
            ['Fabricante', equipment.manufacturer || '-'],
            ['Tipo de equipo', equipment.equipmentType || '-'],
            ['Tecnología', equipment.technology || '-'],
            ['Contrato', contract?.company || '-'],
            ['Número de contrato', contract?.contractNumber || '-'],
            ['Inicio contrato', contract?.startDate ? contract.startDate.slice(0, 10) : '-'],
            ['Fin contrato', contract?.endDate ? contract.endDate.slice(0, 10) : '-'],
            ['Observaciones', equipment.observations || '-'],
          ];
          const escapeHtml = (value) => String(value ?? '-')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;');
          const rowsHtml = rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('');
          const maintenanceRows = (equipment.maintenances || []).map((maintenance) => `
            <tr>
              <td>${escapeHtml(maintenance.type)}</td>
              <td>${escapeHtml(maintenance.status)}</td>
              <td>${escapeHtml(maintenance.scheduledDate ? maintenance.scheduledDate.slice(0, 10) : '-')}</td>
              <td>${escapeHtml(maintenance.company || '-')}</td>
              <td>${escapeHtml(maintenance.responsible || maintenance.technician?.name || '-')}</td>
              <td>${escapeHtml(maintenance.cost == null ? '-' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(maintenance.cost)))}</td>
              <td>${escapeHtml(maintenance.description || '-')}</td>
            </tr>
          `).join('');
          printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Hoja de vida - ${escapeHtml(equipment.name)}</title>
            <style>
              *{box-sizing:border-box}body{margin:0;color:#1f2937;font-family:Arial,sans-serif;font-size:12px;line-height:1.4}.sheet{max-width:1100px;margin:0 auto}
              .header{background:#1f2a40;color:#fff;padding:30px 40px;text-align:center}.header h1{margin:0;font-size:26px}.subtitle{margin-top:8px;color:#c5cfdf}.date{margin-top:12px;color:#e5eaf2;font-size:11px}
              .content{padding:26px 34px}.section-title{margin:22px 0 10px;border-bottom:2px solid #9aa4b2;padding-bottom:7px;color:#1f2a40;font-size:15px;font-weight:700;text-transform:uppercase}
              table{width:100%;border-collapse:collapse}tr:nth-child(odd){background:#f5f7fb}th,td{padding:8px 10px;border-bottom:1px solid #e4e8ef;text-align:left;vertical-align:top}th{width:30%;color:#68778a;font-size:11px}td{font-size:12px}
              .history th{width:auto;font-size:10px;text-transform:uppercase}.history td{font-size:11px}@page{size:landscape;margin:10mm}@media print{.header,tr:nth-child(odd){print-color-adjust:exact;-webkit-print-color-adjust:exact}}
            </style></head><body><div class="sheet"><header class="header"><h1>Hoja de vida de ${escapeHtml(equipment.name)}</h1><div class="subtitle">Ficha técnica e histórico de mantenimiento</div><div class="date">Fecha de impresión: ${escapeHtml(new Date().toLocaleString('es-CO'))}</div></header>
            <main class="content"><div class="section-title">Información del equipo</div><table><tbody>${rowsHtml}</tbody></table>
            <div class="section-title">Histórico de mantenimiento (${equipment.maintenances?.length || 0})</div><table class="history"><thead><tr><th>Tipo</th><th>Estado</th><th>Fecha</th><th>Empresa</th><th>Responsable</th><th>Costo</th><th>Descripción</th></tr></thead><tbody>${maintenanceRows || '<tr><td colspan="7">Sin mantenimientos registrados.</td></tr>'}</tbody></table></main></div></body></html>`);
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
        } catch (err) {
          printWindow.close();
          setError(`No se pudo generar la hoja de vida en PDF: ${err.message}`);
        }
      }
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Equipos biomédicos</h1>
          <p>Consulta, filtra y administra las hojas de vida.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" type="button" onClick={() => downloadExcel('equipos-bioguard.xlsx', equipmentImportHeaders.map(([, label]) => label), items.map((item) => equipmentImportHeaders.map(([key]) => item[key] ?? '')))}>
            <Download size={16} /> Descargar XLSX
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => downloadExcelTemplate('equipos-bioguard-plantilla.xlsx', equipmentImportHeaders)}>
            <FileDown size={16} /> Plantilla
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => importRef.current?.click()}>
            <Upload size={16} /> Importar Excel
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
          <button className="btn btn-secondary" type="button" onClick={() => printEquipmentList(items)}>
            <Printer size={16} /> PDF
          </button>
          <Link className="btn btn-primary" to="/equipos/nuevo">
            <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Nueva hoja de vida
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="form-field">
            <label>Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: 14, color: '#94a3b8' }}
              />
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                placeholder="Nombre, marca, serie, inventario..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          <div className="form-field">
            <label>Estado</label>
            <select
              className="select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="MAINTENANCE">En mantenimiento</option>
              <option value="RETIRED">Dado de baja</option>
            </select>
          </div>
          <div className="form-field">
            <label>Área</label>
            <select
              className="select"
              value={filters.areaId}
              onChange={(e) => setFilters({ ...filters, areaId: e.target.value })}
            >
              <option value="">Todas</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="card">{error}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Serie</th>
              <th>Área</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.brand}</td>
                <td>{item.model || '-'}</td>
                <td>{item.serialNumber}</td>
                <td>{item.area?.name || '-'}</td>
                <td>{item.status}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <Link className="btn btn-secondary" to={`/equipos/${item.id}`}>Ver hoja de vida</Link>
                    <Link className="btn btn-secondary" to={`/equipos/${item.id}/editar`} title="Editar hoja de vida" aria-label={`Editar ${item.name}`}><Pencil size={16} /></Link>
                    <button className="btn btn-secondary" type="button" onClick={() => printEquipmentSheet(item)} title="Descargar hoja de vida en PDF" aria-label={`Descargar PDF de ${item.name}`}><Printer size={16} /></button>
                    <button className="btn btn-danger" type="button" onClick={() => handleDelete(item.id)} title="Eliminar hoja de vida" aria-label={`Eliminar ${item.name}`}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="empty-state">Aún no hay equipos registrados.</div>}
      </div>
    </div>
  );
}
