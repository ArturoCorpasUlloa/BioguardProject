import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Download, Filter, Plus, Printer, Trash2, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { areasApi, equipmentApi, operationsApi } from '../services/api';

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const typeLabels = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  CALIBRATION: 'Calibración',
  QUALITY: 'Calidad',
};

function downloadScheduleCsv(items, year) {
  const headers = ['Equipo', 'Serial', 'Ubicación', 'Sede', 'Frecuencia', 'Fecha de mantenimiento'];
  const rows = items.map((item) => [
    item.equipment?.name || '',
    item.equipment?.serialNumber || '',
    item.equipment?.location || '',
    item.equipment?.area?.location || item.equipment?.area?.name || '',
    item.equipment?.maintenanceFrequency || '',
    new Date(item.rescheduledDate || item.scheduledDate).toISOString().slice(0, 10),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `cronograma-${year}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printSchedule(items, year) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const rowsHtml = items.map((item) => `
    <tr>
      <td><strong>${item.equipment?.name || '-'}</strong></td>
      <td>${item.equipment?.serialNumber || '-'}</td>
      <td>${item.equipment?.location || '-'}</td>
      <td>${item.equipment?.area?.location || item.equipment?.area?.name || '-'}</td>
      <td>${item.equipment?.maintenanceFrequency || '-'}</td>
      <td>${new Date(item.rescheduledDate || item.scheduledDate).toISOString().slice(0, 10)}</td>
    </tr>
  `).join('');
  const html = `<!doctype html>
    <html><head><meta charset="utf-8" /><title>Cronograma ${year}</title>
    <style>
      :root { color-scheme: light; } * { box-sizing: border-box; }
      body { margin: 0; color: #1f2937; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.4; }
      .sheet { max-width: 1050px; margin: 0 auto; } .header { background: #1f2a40; color: #fff; min-height: 142px; padding: 30px 42px 26px; text-align: center; }
      h1 { margin: 0; font-size: 28px; } .subtitle { margin-top: 10px; color: #c5cfdf; font-size: 13px; } .date { margin-top: 14px; color: #e5eaf2; font-size: 11px; }
      .content { padding: 28px 36px 40px; } .section-title { margin: 0 0 12px; border-bottom: 2px solid #9aa4b2; padding-bottom: 8px; color: #1f2a40; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
      table { width: 100%; border-collapse: collapse; } tr:nth-child(even) { background: #f5f7fb; } th, td { padding: 11px 12px; border-bottom: 1px solid #e4e8ef; text-align: left; vertical-align: top; } th { color: #68778a; font-size: 10px; text-transform: uppercase; } td { color: #273142; font-size: 12px; } td span { color: #68778a; font-size: 11px; }
      @page { size: landscape; margin: 10mm; } @media print { .header, tr:nth-child(even) { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style></head>
    <body><div class="sheet"><div class="header"><h1>Cronograma anual ${year}</h1><div class="subtitle">Calendario de mantenimientos y actividades programadas</div><div class="date">Fecha de impresión: ${new Date().toLocaleString('es-CO')}</div></div>
    <main class="content"><div class="section-title">Eventos programados (${items.length})</div><table><thead><tr><th>Fecha</th><th>Equipo</th><th>Tipo</th><th>Notas</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="4">No hay eventos de mantenimiento para imprimir.</td></tr>'}</tbody></table></main></div></body></html>`;
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

export default function SchedulePage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState([]);
  const [areas, setAreas] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [filter, setFilter] = useState({ type: '', areaId: '' });
  const [selectedStat, setSelectedStat] = useState('ALL');
  const [form, setForm] = useState({ equipmentId: '', maintenanceType: 'PREVENTIVE', scheduledDate: '', status: 'SCHEDULED', rescheduledDate: '', changeJustification: '', notes: '' });
  const [editingId, setEditingId] = useState(null);
  const [statusActionId, setStatusActionId] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'RESCHEDULED', rescheduledDate: '', changeJustification: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadSchedule(targetYear = year) {
    setItems(await operationsApi.schedule.list({ year: targetYear }));
  }

  useEffect(() => {
    Promise.all([areasApi.list(), equipmentApi.list()]).then(([areaList, equipmentList]) => {
      setAreas(areaList);
      setEquipment(equipmentList);
    }).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadSchedule().catch((err) => setError(err.message));
  }, [year]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      if (editingId) await operationsApi.schedule.update(editingId, form);
      else await operationsApi.schedule.create(form);
      setForm({ equipmentId: '', maintenanceType: 'PREVENTIVE', scheduledDate: '', status: 'SCHEDULED', rescheduledDate: '', changeJustification: '', notes: '' });
      setMessage('Programación guardada correctamente.');
      await loadSchedule();
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta programación?')) return;
    try {
      await operationsApi.schedule.remove(id);
      setMessage('Programación eliminada.');
      await loadSchedule();
    } catch (err) {
      setError(err.message);
    }

  }

  async function handleStatusSubmit(event, item) {
    event.preventDefault();
    try {
      await operationsApi.schedule.update(item.id, {
        status: statusForm.status,
        rescheduledDate: statusForm.status === 'RESCHEDULED' ? statusForm.rescheduledDate : null,
        changeJustification: statusForm.changeJustification || null,
      });
      setStatusActionId(null);
      setStatusForm({ status: 'RESCHEDULED', rescheduledDate: '', changeJustification: '' });
      setMessage(statusForm.status === 'EXECUTED' ? 'Mantenimiento marcado como ejecutado.' : 'Mantenimiento reprogramado.');
      await loadSchedule();
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredItems = useMemo(() => items.filter((item) => (
    (!filter.type || item.maintenanceType === filter.type) &&
    (!filter.areaId || String(item.equipment?.areaId) === String(filter.areaId)) &&
    (selectedStat === 'ALL' || (selectedStat === 'EXECUTED' && item.status === 'EXECUTED') || (selectedStat === 'PREVENTIVE' && item.maintenanceType === 'PREVENTIVE') || (selectedStat === 'CORRECTIVE' && item.maintenanceType === 'CORRECTIVE') || (selectedStat === 'UPCOMING' && new Date(item.scheduledDate) >= new Date()))
  )), [items, filter, selectedStat]);
  const grouped = months.map((month, index) => ({ month, items: filteredItems.filter((item) => new Date(item.rescheduledDate || item.scheduledDate).getMonth() === index) }));
  const stats = {
    total: filteredItems.length,
    executed: filteredItems.filter((item) => item.status === 'EXECUTED').length,
    preventive: filteredItems.filter((item) => item.maintenanceType === 'PREVENTIVE').length,
    corrective: filteredItems.filter((item) => item.maintenanceType === 'CORRECTIVE').length,
    upcoming: filteredItems.filter((item) => new Date(item.scheduledDate) >= new Date()).length,
  };
  const formatDate = (value) => new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(value));
  const activeLegend = {
    ALL: 'Programaciones',
    PREVENTIVE: 'Preventivos',
    CORRECTIVE: 'Correctivos',
    UPCOMING: 'Próximos',
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Cronograma anual</h1><p>Programa mantenimientos, calibraciones y controles de calidad.</p></div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" type="button" onClick={() => downloadScheduleCsv(filteredItems, year)}><Download size={16} /> Excel</button>
          <button className="btn btn-secondary" type="button" onClick={() => printSchedule(filteredItems, year)}><Printer size={16} /> PDF</button>
        <div className="year-picker"><CalendarDays size={18} /><select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>{[year - 1, year, year + 1].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        </div>
      </div>
      {error && <div className="card error-message">{error}</div>}
      {message && <div className="card success-message">{message}</div>}

      <form className="card schedule-form" onSubmit={handleSubmit}>
        <div className="section-heading"><div><h2>{editingId ? 'Editar programación' : 'Nueva programación'}</h2><p>Agrega o actualiza una actividad del calendario anual.</p></div><Plus size={24} /></div>
        <div className="form-grid">
          <div className="form-field"><label>Equipo</label><select className="select" value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })} required><option value="">Seleccionar equipo</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div className="form-field"><label>Tipo</label><select className="select" value={form.maintenanceType} onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}><option value="PREVENTIVE">Preventivo</option><option value="CORRECTIVE">Correctivo</option><option value="CALIBRATION">Calibración</option><option value="QUALITY">Control de calidad</option></select></div>
          <div className="form-field"><label>Fecha</label><input className="input" type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} required /></div>
          <div className="form-field"><label>Estado</label><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="SCHEDULED">Programado</option><option value="EXECUTED">Ejecutado</option><option value="RESCHEDULED">Reprogramado</option></select></div>
          {form.status === 'RESCHEDULED' && <><div className="form-field"><label>Nueva fecha</label><input className="input" type="date" value={form.rescheduledDate} onChange={(e) => setForm({ ...form, rescheduledDate: e.target.value })} required /></div><div className="form-field"><label>Justificación</label><input className="input" value={form.changeJustification} onChange={(e) => setForm({ ...form, changeJustification: e.target.value })} required /></div></>}
        </div>
        <div className="form-field"><label>Notas</label><input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones de la actividad (opcional)" /></div>
        <button className="btn btn-primary"><Plus size={16} /> {editingId ? 'Actualizar actividad' : 'Programar actividad'}</button>
      </form>

      <div className="schedule-stats">
        <button type="button" className="stat-card" onClick={() => setSelectedStat('ALL')}><CalendarDays size={20} /><span>Programaciones</span><strong>{stats.total}</strong></button>
        <button type="button" className="stat-card" onClick={() => setSelectedStat('EXECUTED')}><CheckCircle2 size={20} /><span>Ejecutados</span><strong>{stats.executed}</strong></button>
        <button type="button" className="stat-card" onClick={() => setSelectedStat('PREVENTIVE')}><Wrench size={20} /><span>Preventivos</span><strong>{stats.preventive}</strong></button>
        <button type="button" className="stat-card" onClick={() => setSelectedStat('CORRECTIVE')}><CheckCircle2 size={20} /><span>Correctivos</span><strong>{stats.corrective}</strong></button>
        <button type="button" className="stat-card" onClick={() => setSelectedStat('UPCOMING')}><Clock3 size={20} /><span>Próximos</span><strong>{stats.upcoming}</strong></button>
      </div>

      <div className="card schedule-filter"><Filter size={18} /><strong>Filtrar cronograma</strong><select className="select" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}><option value="">Todos los tipos</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select className="select" value={filter.areaId} onChange={(e) => setFilter({ ...filter, areaId: e.target.value })}><option value="">Todas las áreas</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <strong>{activeLegend[selectedStat] || 'Ejecutados'}:</strong>
        {filteredItems.length ? (
          <span style={{ marginLeft: 8 }}>{filteredItems.length} registros</span>
        ) : (
          <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>No contiene datos</span>
        )}
      </div>

      <div className="calendar-grid">
        {grouped.map(({ month, items: monthItems }) => (
          <section key={month} className={`calendar-month ${monthItems.length ? 'has-events' : ''}`}>
            <div className="month-heading"><h3>{month}</h3><span>{monthItems.length}</span></div>
            {monthItems.length ? monthItems.map((item) => <article key={item.id} className={`calendar-event ${item.status === 'EXECUTED' ? 'calendar-event-executed' : ''}`}>
              <div className="event-date">{formatDate(item.rescheduledDate || item.scheduledDate)}</div>
              <strong>{item.equipment.name}</strong>
              <span>{typeLabels[item.maintenanceType] || item.maintenanceType} · {item.status === 'EXECUTED' ? 'Ejecutado' : item.status === 'RESCHEDULED' ? 'Reprogramado' : 'Programado'}</span>
              <div className="event-actions">
                <Link to={`/equipos/${item.equipment.id}`}>Ver equipo</Link>
                <button type="button" onClick={() => { setEditingId(item.id); setForm({ equipmentId: item.equipmentId, maintenanceType: item.maintenanceType, scheduledDate: item.scheduledDate.slice(0, 10), notes: item.notes || '', status: item.status || 'SCHEDULED', rescheduledDate: item.rescheduledDate?.slice(0, 10) || '', changeJustification: item.changeJustification || '' }); }}>Editar</button>
                {item.maintenanceType === 'PREVENTIVE' && item.status !== 'EXECUTED' && <button type="button" onClick={() => { setStatusActionId(item.id); setStatusForm({ status: 'EXECUTED', rescheduledDate: '', changeJustification: '' }); }}>Marcar ejecutado</button>}
                {item.maintenanceType === 'PREVENTIVE' && item.status !== 'EXECUTED' && <button type="button" onClick={() => { setStatusActionId(item.id); setStatusForm({ status: 'RESCHEDULED', rescheduledDate: '', changeJustification: '' }); }}>Reprogramar</button>}
                <button type="button" aria-label="Eliminar programación" onClick={() => handleDelete(item.id)}><Trash2 size={15} /></button>
              </div>
              {statusActionId === item.id && <form className="form-grid" onSubmit={(event) => handleStatusSubmit(event, item)} style={{ marginTop: '0.75rem' }}>
                {statusForm.status === 'RESCHEDULED' && <div className="form-field"><label>Nueva fecha</label><input className="input" type="date" value={statusForm.rescheduledDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setStatusForm({ ...statusForm, rescheduledDate: event.target.value })} required /></div>}
                <div className="form-field"><label>{statusForm.status === 'EXECUTED' ? 'Observación (opcional)' : 'Justificación'}</label><input className="input" value={statusForm.changeJustification} onChange={(event) => setStatusForm({ ...statusForm, changeJustification: event.target.value })} required={statusForm.status === 'RESCHEDULED'} /></div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}><button className="btn btn-primary" type="submit">{statusForm.status === 'EXECUTED' ? 'Confirmar ejecución' : 'Guardar reprogramación'}</button><button className="btn btn-secondary" type="button" onClick={() => setStatusActionId(null)}>Cancelar</button></div>
              </form>}
            </article>) : <p className="month-empty">No contiene datos</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
