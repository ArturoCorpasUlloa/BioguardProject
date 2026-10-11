import { useEffect, useState } from 'react';
import { areasApi } from '../services/api';

const empty = { name: '', code: '', location: '', responsible: '', active: true };

export default function AreasPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() { setItems(await areasApi.list()); }
  useEffect(() => { load().catch((err) => setError(err.message)); }, []);
  async function submit(event) {
    event.preventDefault();
    try {
      if (editingId) await areasApi.update(editingId, form); else await areasApi.create(form);
      setForm(empty); setEditingId(null); setMessage('Área guardada.'); setError(''); await load();
    } catch (err) { setError(err.message); }
  }
  async function remove(id) {
    if (!window.confirm('¿Eliminar esta área?')) return;
    try { await areasApi.remove(id); await load(); setMessage('Área eliminada.'); } catch (err) { setError(err.message); }
  }
  return <div className="page">
    <div className="page-header"><div><h1>Áreas y ubicaciones</h1><p>Administra los nombres y responsables de las áreas.</p></div></div>
    {error && <div className="card error-message">{error}</div>}{message && <div className="card success-message">{message}</div>}
    <form className="card" onSubmit={submit}><h2>{editingId ? 'Editar área' : 'Nueva área'}</h2><div className="form-grid">
      {['name', 'code', 'location', 'responsible'].map((field) => <div className="form-field" key={field}><label>{field === 'name' ? 'Nombre' : field === 'code' ? 'Código' : field === 'location' ? 'Ubicación' : 'Responsable'}</label><input className="input" required={field === 'name'} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></div>)}
      <label className="form-field"><span>Activa</span><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></label>
    </div><button className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button></form>
    <div className="card table-wrap"><table><thead><tr><th>Nombre</th><th>Código</th><th>Ubicación</th><th>Responsable</th><th>Equipos</th><th>Acciones</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.code || '-'}</td><td>{item.location || '-'}</td><td>{item.responsible || '-'}</td><td>{item._count?.equipment || 0}</td><td><button className="btn btn-secondary" type="button" onClick={() => { setEditingId(item.id); setForm({ ...empty, ...item }); }}>Editar</button>{!item._count?.equipment && <button className="btn btn-danger" type="button" onClick={() => remove(item.id)}>Eliminar</button>}</td></tr>)}</tbody></table></div>
  </div>;
}
