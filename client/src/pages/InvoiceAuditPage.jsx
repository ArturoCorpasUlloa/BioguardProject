import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Printer, Trash2, X } from 'lucide-react';
import { equipmentApi } from '../services/api';
import { invoiceAuditApi } from '../services/invoiceAuditApi';

const empty = {
  period: new Date().toISOString().slice(0, 7),
  company: '', equipmentId: '', service: '', invoiceNumber: '', invoiceDate: '',
  fixedMonthlyCost: '', invoicedValue: '', status: 'REVIEWED', comment: '',
  thresholdPercent: 10, recurrenceMonths: 1, items: [{ concept: '', amount: '' }],
};
const statuses = [
  ['REVIEWED', 'Revisada'], ['APPROVED', 'Aprobada'], ['WITH_ISSUE', 'Con novedad'], ['NOT_SUBMITTED', 'No presentada por contabilidad'],
];
const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
const dateText = (value) => value ? String(value).slice(0, 10) : '-';
const statusText = Object.fromEntries(statuses);

function calculate(form) {
  const additionalTotal = form.items.reduce((total, item) => total + Number(item.amount || 0), 0);
  const expectedValue = Number(form.fixedMonthlyCost || 0) + additionalTotal;
  const invoicedValue = Number(form.invoicedValue || 0);
  return { additionalTotal, expectedValue, difference: invoicedValue - expectedValue, variationPercent: expectedValue ? ((invoicedValue - expectedValue) / expectedValue) * 100 : 0 };
}

function printAudit(title, item) {
  const popup = window.open('', '_blank');
  if (!popup) return;
  const calc = calculate(item);
  const reasons = item.attentionReasons || [];
  popup.document.write(`<html><head><title>${title}</title><style>body{font:14px Arial;color:#1f2937;padding:30px}h1{color:#1f2a40}table{border-collapse:collapse;width:100%;max-width:900px}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd}th{width:35%;color:#68778a}.alert{margin-top:24px;padding:14px;background:#fff3cd;border:1px solid #f0c36d}</style></head><body><h1>${title}</h1><p>Generado: ${new Date().toLocaleString('es-CO')}</p><table>${[
    ['Empresa', item.company], ['Equipo/servicio', item.service || '-'], ['Periodo', item.period], ['Factura', item.invoiceNumber || '-'], ['Fecha', dateText(item.invoiceDate)],
    ['Costo fijo mensual', money(item.fixedMonthlyCost)], ['Adicionales', (item.items || []).map((line) => `${line.concept}: ${money(line.amount)}`).join('<br>') || '-'],
    ['Valor esperado', money(item.expectedValue ?? calc.expectedValue)], ['Valor facturado', money(item.invoicedValue)], ['Diferencia', money(item.difference ?? calc.difference)],
    ['Variación', `${Number(item.variationPercent ?? calc.variationPercent).toFixed(2)}%`], ['Estado', statusText[item.status] || item.status], ['Comentario', item.comment || '-'],
  ].map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('')}</table><div class="alert"><strong>ATENCIÓN REQUERIDA</strong><br>${reasons.length ? reasons.join('<br>') : 'Sin atención requerida.'}</div></body></html>`);
  popup.document.close(); popup.focus(); popup.print();
}

export default function InvoiceAuditPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [audits, totals] = await Promise.all([invoiceAuditApi.list(period), invoiceAuditApi.summary(period)]);
    setItems(audits); setSummary(totals);
  }
  useEffect(() => { Promise.all([load(), equipmentApi.list().then(setEquipment)]).catch((err) => setError(err.message)); }, [period]);

  const computed = useMemo(() => calculate(form), [form]);
  const equipmentName = (equipmentId, service) => equipment.find((item) => String(item.id) === String(equipmentId))?.name || service || '-';
  function updateItem(index, field, value) {
    setForm((current) => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
  }
  async function save(event) {
    event.preventDefault();
    try {
      const payload = { ...form, equipmentId: form.equipmentId || null, fixedMonthlyCost: Number(form.fixedMonthlyCost || 0), invoicedValue: Number(form.invoicedValue || 0), thresholdPercent: Number(form.thresholdPercent || 10), recurrenceMonths: Number(form.recurrenceMonths || 1), items: form.items.filter((item) => item.concept.trim()).map((item) => ({ concept: item.concept, amount: Number(item.amount || 0) })) };
      if (!payload.company || !payload.period) throw new Error('Empresa y periodo son obligatorios.');
      if (editing) await invoiceAuditApi.update(editing, payload); else await invoiceAuditApi.create(payload);
      setOpen(false); setEditing(null); setForm(empty); await load();
    } catch (err) { setError(err.message); }
  }
  function edit(item) {
    setEditing(item.id); setForm({ ...item, equipmentId: item.equipmentId || '', invoiceDate: dateText(item.invoiceDate), fixedMonthlyCost: item.fixedMonthlyCost, invoicedValue: item.invoicedValue, thresholdPercent: item.thresholdPercent, recurrenceMonths: 1, items: item.items.length ? item.items : [{ concept: '', amount: '' }] }); setOpen(true);
  }
  async function changeStatus(item, status) {
    try { await invoiceAuditApi.updateStatus(item.id, status); await load(); } catch (err) { setError(err.message); }
  }
  async function remove(item) {
    if (!window.confirm('¿Eliminar esta auditoría?')) return;
    try { await invoiceAuditApi.remove(item.id); await load(); } catch (err) { setError(err.message); }
  }
  function printSummary() {
    const rows = items.map((item) => `<tr><td>${item.company}</td><td>${item.period}</td><td>${money(item.expectedValue)}</td><td>${money(item.invoicedValue)}</td><td>${money(item.difference)}</td><td>${statusText[item.status]}</td></tr>`).join('');
    const popup = window.open('', '_blank'); if (!popup) return;
    popup.document.write(`<html><head><title>Resumen auditoría ${period}</title><style>body{font:13px Arial;padding:25px}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><h1>Auditoría de facturas · ${period}</h1><p>Total: ${summary.total} · Aprobadas: ${summary.approved} · Atención requerida: ${summary.attention}</p><table><tr><th>Empresa</th><th>Periodo</th><th>Esperado</th><th>Facturado</th><th>Diferencia</th><th>Estado</th></tr>${rows || '<tr><td colspan="6">Sin registros</td></tr>'}</table><h2>ATENCIÓN REQUERIDA</h2><p>${items.filter((item) => item.attentionRequired).map((item) => `${item.company}: ${item.attentionReasons.join(', ')}`).join('<br>') || 'Sin atención requerida.'}</p></body></html>`); popup.document.close(); popup.focus(); popup.print();
  }

  return <div className="page">
    <div className="page-header"><div><h1>Auditoría de facturas</h1><p>Comparación mensual de valores fijos, adicionales y facturación.</p></div><div className="section-actions"><label className="form-field">Periodo<input className="input" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></label><button className="btn btn-secondary" onClick={printSummary}><Printer size={16} /> PDF resumen del periodo</button><button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ ...empty, period }); setOpen(true); }}><Plus size={16} /> Nueva auditoría</button></div></div>
    {error && <div className="card error-message">{error}<button className="btn btn-secondary" onClick={() => setError('')}><X size={14} /></button></div>}
    {summary && <div className="grid-stats"><div className="stat-card"><span>Total facturas</span><strong>{summary.total}</strong></div><div className="stat-card"><span>Aprobadas</span><strong>{summary.approved}</strong></div><div className="stat-card"><span>Revisadas</span><strong>{summary.reviewed}</strong></div><div className="stat-card"><span>Con novedad</span><strong>{summary.withIssue}</strong></div><div className="stat-card"><span>No presentadas</span><strong>{summary.notSubmitted}</strong></div><div className="stat-card"><span>Atención requerida</span><strong>{summary.attention}</strong></div></div>}
    {summary && <div className="card"><strong>Totales del periodo:</strong> Fijo {money(summary.fixedTotal)} · Adicionales {money(summary.additionalTotal)} · Esperado {money(summary.expectedTotal)} · Facturado {money(summary.invoicedTotal)} · Diferencia {money(summary.differenceTotal)}</div>}
    <div className="card"><h2>ATENCIÓN REQUERIDA</h2>{items.filter((item) => item.attentionRequired).map((item) => <button className="alert-row" key={item.id} onClick={() => edit(item)}>{item.company} · {item.invoiceNumber || 'Sin factura'} · {item.attentionReasons.join(', ')}</button>)}{!items.some((item) => item.attentionRequired) && <p>Sin atención requerida.</p>}</div>
    <div className="card table-wrap"><table><thead><tr>{['Periodo','Empresa','Equipo/Servicio externo','Factura','Costo fijo','Adicionales','Esperado','Facturado','Diferencia','Variación','Estado','Comentario','Acciones'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.period}{item.recurrenceIndex ? ` (${item.recurrenceIndex}/${item.recurrenceMonths})` : ''}</td><td>{item.company}</td><td>{equipmentName(item.equipmentId, item.service)}</td><td>{item.invoiceNumber || '-'}</td><td>{money(item.fixedMonthlyCost)}</td><td>{money(item.additionalTotal)}</td><td>{money(item.expectedValue)}</td><td>{money(item.invoicedValue)}</td><td>{money(item.difference)}</td><td>{Number(item.variationPercent).toFixed(2)}%</td><td><span className={`badge ${item.status === 'APPROVED' ? 'badge-success' : item.attentionRequired ? 'badge-danger' : 'badge-info'}`}>{statusText[item.status]}</span></td><td>{item.comment || '-'}</td><td><div className="section-actions"><button className="btn btn-secondary" onClick={() => edit(item)} title="Editar datos"><Pencil size={14} /></button>{statuses.filter(([value]) => value !== item.status).map(([value, label]) => <button key={value} className="btn btn-secondary" onClick={() => changeStatus(item, value)} title={`Marcar como ${label}`}>{label}</button>)}<button className="btn btn-secondary" onClick={() => printAudit(`Auditoría ${item.invoiceNumber || item.id}`, item)}><Printer size={14} /></button><button className="btn btn-danger" onClick={() => remove(item)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>
    {open && <div className="import-modal-backdrop"><form className="import-modal" onSubmit={save}><div className="section-heading"><h2>{editing ? 'Editar auditoría' : 'Nueva auditoría'}</h2><button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}><X size={16} /></button></div><div className="form-grid"><label className="form-field">Periodo<input className="input" type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required /></label><label className="form-field">Empresa<input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required /></label><label className="form-field">Equipo médico (opcional)<select className="select" value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}><option value="">No está en equipos médicos</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.serialNumber}</option>)}</select></label><label className="form-field">Equipo o servicio externo<input className="input" placeholder="Ej. Impresora de recepción" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} /></label><label className="form-field">Número de factura<input className="input" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></label><label className="form-field">Fecha factura<input className="input" type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} /></label><label className="form-field">Costo fijo mensual<input className="input" type="number" min="0" value={form.fixedMonthlyCost} onChange={(e) => setForm({ ...form, fixedMonthlyCost: e.target.value })} required /></label><label className="form-field">Valor facturado<input className="input" type="number" min="0" value={form.invoicedValue} onChange={(e) => setForm({ ...form, invoicedValue: e.target.value })} required /></label><label className="form-field">Meses de recurrencia<input className="input" type="number" min="1" max="60" value={form.recurrenceMonths} onChange={(e) => setForm({ ...form, recurrenceMonths: e.target.value })} /><small>Se crearán registros mensuales; los siguientes quedarán como No presentada.</small></label><label className="form-field">Estado inicial<select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-field">Umbral de alerta (%)<input className="input" type="number" min="0" max="100" value={form.thresholdPercent} onChange={(e) => setForm({ ...form, thresholdPercent: e.target.value })} /></label></div><h3>Costos adicionales</h3>{form.items.map((item, index) => <div className="form-grid" key={index}><input className="input" placeholder="Concepto" value={item.concept} onChange={(e) => updateItem(index, 'concept', e.target.value)} /><input className="input" type="number" min="0" placeholder="Valor" value={item.amount} onChange={(e) => updateItem(index, 'amount', e.target.value)} /></div>)}<button type="button" className="btn btn-secondary" onClick={() => setForm({ ...form, items: [...form.items, { concept: '', amount: '' }] })}>Agregar concepto</button><div className="card"><strong>Esperado:</strong> {money(computed.expectedValue)} · <strong>Diferencia:</strong> {money(computed.difference)} · <strong>Variación:</strong> {computed.variationPercent.toFixed(2)}%</div><label className="form-field">Comentario / observación<textarea className="textarea" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></label><div className="section-actions"><button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary">Guardar auditoría</button></div></form></div>}
  </div>;
}
