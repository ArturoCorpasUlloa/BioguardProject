import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi, equipmentApi, operationsApi } from '../services/api';
import { downloadExcel } from '../utils/excel';

function StatusBadge({ status }) {
  const map = {
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-warning',
    MAINTENANCE: 'badge-info',
    BLOCKED: 'badge-danger',
    RETIRED: 'badge-danger',
  };
  return <span className={`badge ${map[status] || 'badge-info'}`}>{status}</span>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [periodType, setPeriodType] = useState('month');
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      dashboardApi.get(),
      equipmentApi.list(),
      operationsApi.maintenance.list(),
      operationsApi.incidents.list(),
      operationsApi.contracts.list(),
    ])
      .then(([dashboard, items, maintenanceItems, incidentItems, contractItems]) => {
        setStats(dashboard);
        setEquipment(items.slice(0, 8));
        setMaintenance(maintenanceItems);
        setIncidents(incidentItems);
        setContracts(contractItems);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const targetYear = periodType === 'year' ? period : period.slice(0, 4);
    operationsApi.schedule.list({ year: targetYear })
      .then(setSchedule)
      .catch((err) => setError(err.message));
  }, [period, periodType]);

  const filtered = equipment.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.brand.toLowerCase().includes(term) ||
      item.serialNumber.toLowerCase().includes(term)
    );
  });

  const periodData = useMemo(() => {
    const matchesPeriod = (value) => {
      if (!value) return false;
      return periodType === 'year'
        ? String(value).slice(0, 4) === period
        : String(value).slice(0, 7) === period;
    };
    return {
      maintenance: [
        ...maintenance
          .filter((item) => matchesPeriod(item.executionDate || item.scheduledDate) && item.status === 'COMPLETED')
          .map((item) => ({ ...item, maintenanceType: item.type })),
        ...schedule
          .filter((item) => matchesPeriod(item.rescheduledDate || item.scheduledDate) && item.status === 'EXECUTED')
          .filter((item) => !maintenance.some((history) => (
            history.equipmentId === item.equipmentId
            && history.type === item.maintenanceType
            && String(history.scheduledDate || '').slice(0, 10) === String(item.rescheduledDate || item.scheduledDate).slice(0, 10)
          ))),
      ],
      incidents: incidents.filter((item) => matchesPeriod(item.reportedAt) && ['HIGH', 'CRITICAL'].includes(item.priority)),
      contracts: contracts.filter((item) => matchesPeriod(item.startDate) || matchesPeriod(item.endDate)),
    };
  }, [contracts, incidents, maintenance, schedule, period, periodType]);

  const periodPreventive = periodData.maintenance.filter((item) => item.maintenanceType === 'PREVENTIVE').length;
  const periodCorrective = periodData.maintenance.filter((item) => item.maintenanceType === 'CORRECTIVE').length;

  function printAlertReport(title, items, fields) {
    const popup = window.open('', '_blank');
    if (!popup) return;
    const rows = items.map((item) => {
      const equipmentName = item.equipment?.name || '-';
      const equipmentCode = item.equipment?.inventoryCode || item.equipment?.serialNumber || '-';
      return `<tr><td>${equipmentName}</td><td>${equipmentCode}</td>${fields.map((field) => `<td>${field(item) || '-'}</td>`).join('')}</tr>`;
    }).join('');
    popup.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;color:#1f2937;padding:28px}h1{color:#1f2a40}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd;vertical-align:top}th{color:#68778a;font-size:11px;text-transform:uppercase}</style></head><body><h1>${title}</h1><p>${items.length} registro(s) · Generado ${new Date().toLocaleString('es-CO')}</p><table><thead><tr><th>Equipo</th><th>Inventario / serie</th>${fields.map((_, index) => `<th>${index === 0 ? 'Concepto / identificador' : 'Fecha / descripción'}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="4">No hay registros</td></tr>'}</tbody></table></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function printAlert(type) {
    const alerts = stats.alerts || {};
    const reports = {
      criticalIncidents: ['Novedades críticas y altas', alerts.criticalIncidents || [], [
        (item) => item.reportNumber || item.priority,
        (item) => `${item.description || '-'}${item.observations ? ` · ${item.observations}` : ''}`,
      ]],
      expiringContracts: ['Contratos por vencer', alerts.expiringContracts || [], [
        (item) => item.contractNumber || item.company,
        (item) => `${item.endDate ? item.endDate.slice(0, 10) : '-'}${item.observations ? ` · ${item.observations}` : ''}`,
      ]],
      expiringLicenses: ['Licencias por vencer', alerts.expiringLicenses || [], [
        (item) => item.licenseType || item.registrationNumber,
        (item) => item.expirationDate ? item.expirationDate.slice(0, 10) : '-',
      ]],
      expiringQualityControls: ['Controles por vencer', alerts.expiringQualityControls || [], [
        (item) => item.result || 'Control de calidad',
        (item) => item.nextControlDate ? item.nextControlDate.slice(0, 10) : '-',
      ]],
      expiringDocuments: ['Documentos por vencer', alerts.expiringDocuments || [], [
        (item) => item.documentType || item.fileName,
        (item) => item.expirationDate ? item.expirationDate.slice(0, 10) : '-',
      ]],
    };
    const report = reports[type];
    if (report) printAlertReport(report[0], report[1], report[2]);
  }

  const periodLabel = periodType === 'year'
    ? period
    : new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })
      .format(new Date(`${period}-01T00:00:00`));
  const maintenanceChartData = stats?.charts?.equipmentByMaintenance || [];

  function downloadDashboardExcel() {
    const rows = [
      ['Periodo', periodLabel],
      ['Equipos totales', stats.totals.equipment],
      ['Equipos activos', stats.totals.activeEquipment],
      ['Preventivos del periodo', periodPreventive],
      ['Correctivos del periodo', periodCorrective],
      ['Novedades críticas y altas del periodo', periodData.incidents.length],
      ['Novedades resueltas', periodData.incidents.filter((item) => ['RESOLVED', 'CLOSED'].includes(item.status)).length],
    ];
    downloadExcel(`panel-bioguard-${periodType}-${period}.xlsx`, ['Indicador', 'Valor'], rows);
  }

  function printDashboard() {
    const rows = [
      ['Periodo', periodLabel],
      ['Equipos totales', stats.totals.equipment],
      ['Equipos activos', stats.totals.activeEquipment],
      ['Preventivos del periodo', periodPreventive],
      ['Correctivos del periodo', periodCorrective],
      ['Novedades críticas y altas del periodo', periodData.incidents.length],
      ['Novedades resueltas', periodData.incidents.filter((item) => ['RESOLVED', 'CLOSED'].includes(item.status)).length],
    ];
    const popup = window.open('', '_blank');
    if (!popup) return;
    popup.document.write(`<html><head><title>Panel BioGuard - ${periodLabel}</title><style>body{font-family:Arial;color:#1f2937;padding:32px}h1{color:#1f2a40}table{border-collapse:collapse;width:100%;max-width:720px}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd}th{width:55%;color:#68778a}</style></head><body><h1>Panel principal BioGuard</h1><p>Periodo: ${periodLabel}</p><table><tbody>${rows.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('')}</tbody></table></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  if (error) {
    return <div className="card">{error}</div>;
  }

  if (!stats) {
    return <div className="card">Cargando panel...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Panel principal</h1>
          <p>Resumen operativo de equipos, mantenimientos y alertas.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="form-field">
            <label>Periodo</label>
            <select className="select" value={periodType} onChange={(event) => {
              const nextType = event.target.value;
              setPeriodType(nextType);
              setPeriod(nextType === 'year' ? period.slice(0, 4) : new Date().toISOString().slice(0, 7));
            }}>
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
          </div>
          <div className="form-field">
            <label>{periodType === 'year' ? 'Año' : 'Mes'}</label>
            <input className="input" type={periodType === 'year' ? 'number' : 'month'} value={period} onChange={(event) => setPeriod(event.target.value)} />
          </div>
          <button type="button" className="btn btn-secondary" onClick={downloadDashboardExcel}><Download size={16} /> Excel</button>
          <button type="button" className="btn btn-secondary" onClick={printDashboard}><Printer size={16} /> PDF</button>
        </div>
      </div>

      <div className="grid-stats">
        <Link className="stat-card" to="/equipos">
          <span>Equipos totales</span>
          <strong>{stats.totals.equipment}</strong>
        </Link>
        <Link className="stat-card" to="/equipos?status=ACTIVE">
          <span>Equipos activos</span>
          <strong>{stats.totals.activeEquipment}</strong>
        </Link>
        <Link className="stat-card" to="/cronograma">
          <span>Mantenimientos programados</span>
          <strong>{stats.totals.scheduledMaintenance}</strong>
        </Link>
        <Link className="stat-card" to="/reportes">
          <span>Preventivos</span>
          <strong>{stats.totals.preventiveCount}</strong>
        </Link>
        <Link className="stat-card" to="/reportes">
          <span>Correctivos</span>
          <strong>{stats.totals.correctiveCount}</strong>
        </Link>
        <button type="button" className="stat-card stat-card-button" onClick={() => printAlert('criticalIncidents')}>
          <span>Novedades críticas y altas</span>
          <strong>{stats.totals.criticalIncidents}</strong>
        </button>
        <button type="button" className="stat-card stat-card-button" onClick={() => printAlert('expiringContracts')}>
          <span>Contratos vencidos o por vencer</span>
          <strong>{stats.totals.expiringContracts}</strong>
        </button>
        <button type="button" className="stat-card stat-card-button" onClick={() => printAlert('expiringLicenses')}>
          <span>Licencias por vencer</span>
          <strong>{stats.totals.expiringLicenses}</strong>
        </button>
        <button type="button" className="stat-card stat-card-button" onClick={() => printAlert('expiringQualityControls')}>
          <span>Controles por vencer</span>
          <strong>{stats.totals.expiringQualityControls}</strong>
        </button>
        <button type="button" className="stat-card stat-card-button" onClick={() => printAlert('expiringDocuments')}>
          <span>Documentos por vencer</span>
          <strong>{stats.totals.expiringDocuments}</strong>
        </button>
      </div>

      <div className="grid-stats">
        <div className="stat-card"><span>Correctivos del periodo</span><strong>{periodCorrective}</strong><small>{periodLabel}</small></div>
        <div className="stat-card"><span>Preventivos del periodo</span><strong>{periodPreventive}</strong><small>{periodLabel}</small></div>
        <div className="stat-card"><span>Novedades críticas y altas del periodo</span><strong>{periodData.incidents.length}</strong><small>{periodLabel}</small></div>
      </div>

      <div className="card">
        <div className="page-header">
          <h1 style={{ fontSize: '1.2rem' }}>Equipos recientes</h1>
          <input
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Buscar por nombre, marca o serie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Marca / Modelo</th>
                <th>Serie</th>
                <th>Área</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><Link to={`/equipos/${item.id}`}>{item.name}</Link></td>
                  <td>
                    {item.brand} {item.model || ''}
                  </td>
                  <td>{item.serialNumber}</td>
                  <td>{item.area?.name || 'Sin área'}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div className="empty-state">No hay equipos registrados.</div>}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Equipo y cantidad de mantenimientos</h2>
        {maintenanceChartData.length ? (
          <div style={{ width: '100%', height: 280, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintenanceChartData} margin={{ top: 20, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="equipment" interval={0} angle={-18} textAnchor="end" height={58} tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [`${value} mantenimiento(s)`, 'Cantidad']} />
                <Bar dataKey="count" name="Mantenimientos" fill="#0ea5a4" radius={[8, 8, 0, 0]}>
                  <LabelList dataKey="count" position="top" fill="#1f2a40" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="empty-state">No hay mantenimientos registrados para graficar.</div>}
      </div>
    </div>
  );
}
