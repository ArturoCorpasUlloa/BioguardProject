import { useEffect, useMemo, useState } from 'react';
import { accessApi } from '../services/api';

const emptyUser = { name: '', email: '', password: '', roleId: '', active: true };
const emptyRole = { name: '', description: '', active: true, permissionKeys: [] };
const labels = { view: 'Ver', create: 'Crear', update: 'Editar', delete: 'Eliminar', execute: 'Ejecutar' };
const moduleLabels = {
  dashboard: 'Panel',
  equipment: 'Equipos',
  areas: 'Áreas',
  maintenance: 'Mantenimientos',
  incidents: 'Incidentes',
  licenses: 'Licencias',
  contracts: 'Contratos',
  quality_controls: 'Controles de calidad',
  dicom: 'AETitle / IP',
  schedule: 'Cronograma',
  invoice_audits: 'Auditoría de facturas',
  reports: 'Reportes',
  users: 'Usuarios',
  roles: 'Perfiles de usuario',
  database_export: 'Exportación de base de datos',
};

export default function AccessControlPage() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [userForm, setUserForm] = useState(emptyUser);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const [userData, roleData, permissionData] = await Promise.all([
      accessApi.users.list(), accessApi.roles.list(), accessApi.permissions(),
    ]);
    setUsers(userData); setRoles(roleData); setPermissions(permissionData);
  }
  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  const groupedPermissions = useMemo(() => permissions.reduce((groups, permission) => {
    (groups[permission.module] ||= []).push(permission);
    return groups;
  }, {}), [permissions]);

  async function saveUser(event) {
    event.preventDefault(); setError('');
    try {
      const payload = { ...userForm, roleId: Number(userForm.roleId) };
      if (!payload.password) delete payload.password;
      if (editingUser) await accessApi.users.update(editingUser, payload);
      else await accessApi.users.create(payload);
      setUserForm(emptyUser); setEditingUser(null); setMessage('Usuario guardado.'); await load();
    } catch (err) { setError(err.message); }
  }

  async function saveRole(event) {
    event.preventDefault(); setError('');
    try {
      if (editingRole) await accessApi.roles.update(editingRole, roleForm);
      else await accessApi.roles.create(roleForm);
      setRoleForm(emptyRole); setEditingRole(null); setMessage('Perfil guardado.'); await load();
    } catch (err) { setError(err.message); }
  }

  async function changePassword(event) {
    event.preventDefault(); setError('');
    try {
      await accessApi.users.changePassword(passwordUser.id, newPassword);
      setPasswordUser(null); setNewPassword('');
      setMessage('Contraseña actualizada.'); 
    } catch (err) { setError(err.message); }
  }

  async function remove(kind, id) {
    if (!window.confirm(`¿Eliminar este ${kind === 'user' ? 'usuario' : 'perfil'}?`)) return;
    try {
      if (kind === 'user') await accessApi.users.remove(id); else await accessApi.roles.remove(id);
      setMessage(`${kind === 'user' ? 'Usuario' : 'Perfil'} desactivado/eliminado.`); await load();
    } catch (err) { setError(err.message); }
  }

  function togglePermission(key) {
    setRoleForm((current) => ({
      ...current,
      permissionKeys: current.permissionKeys.includes(key)
        ? current.permissionKeys.filter((item) => item !== key)
        : [...current.permissionKeys, key],
    }));
  }

  return <div className="page">
    <div className="page-header"><div><h1>Perfiles de usuario</h1><p>Administra usuarios, perfiles y permisos por módulo.</p></div></div>
    {error && <div className="card error-message">{error}</div>}
    {message && <div className="card success-message">{message}</div>}
    <div className="tabs">
      <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('users')}>Usuarios</button>
      <button className={`btn ${tab === 'roles' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('roles')}>Perfiles y permisos</button>
    </div>
    {tab === 'users' ? <section className="card">
      <h2>{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h2>
      <form onSubmit={saveUser} className="form-grid">
        <label className="form-field">Nombre<input className="input" required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></label>
        <label className="form-field">Correo<input className="input" required type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></label>
        <label className="form-field">Contraseña{editingUser && <small> Dejar vacía para conservarla</small>}<input className="input" required={!editingUser} type="password" minLength="6" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></label>
        <label className="form-field">Perfil<select className="select" required value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}><option value="">Selecciona un perfil</option>{roles.filter((role) => role.active).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        <label className="form-field"><span>Activo</span><input type="checkbox" checked={userForm.active} onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })} /></label>
        <div><button className="btn btn-primary">{editingUser ? 'Actualizar' : 'Crear usuario'}</button></div>
      </form>
      {passwordUser && <form className="card password-card" onSubmit={changePassword}><h3>Cambiar contraseña: {passwordUser.name}</h3><div className="form-grid"><label className="form-field">Nueva contraseña<input className="input" required minLength="6" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label></div><button className="btn btn-primary">Guardar contraseña</button><button className="btn btn-secondary" type="button" onClick={() => { setPasswordUser(null); setNewPassword(''); }}>Cancelar</button></form>}
      <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Perfil</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.role.name}</td><td>{user.active ? 'Activo' : 'Inactivo'}</td><td><button className="btn btn-secondary" onClick={() => { setEditingUser(user.id); setUserForm({ name: user.name, email: user.email, password: '', roleId: user.role.id, active: user.active }); }}>Editar</button><button className="btn btn-secondary" onClick={() => { setPasswordUser(user); setNewPassword(''); }}>Cambiar contraseña</button>{user.active && user.role.name !== 'ADMIN' && <button className="btn btn-danger" onClick={() => remove('user', user.id)}>Desactivar</button>}</td></tr>)}</tbody></table></div>
    </section> : <section className="card">
      <h2>{editingRole ? 'Editar perfil' : 'Nuevo perfil'}</h2>
      <form onSubmit={saveRole}>
        <div className="form-grid"><label className="form-field">Nombre<input className="input" required value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} /></label><label className="form-field">Descripción<input className="input" value={roleForm.description || ''} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} /></label><label className="form-field"><span>Activo</span><input type="checkbox" disabled={roleForm.name === 'ADMIN'} checked={roleForm.name === 'ADMIN' || roleForm.active} onChange={(e) => setRoleForm({ ...roleForm, active: e.target.checked })} /></label></div>
        <h3>Permisos por módulo</h3>
        <div className="permission-grid">{Object.entries(groupedPermissions).map(([module, modulePermissions]) => <div className="permission-group" key={module}><strong>{moduleLabels[module] || module}</strong>{modulePermissions.map((permission) => <label key={permission.key}><input type="checkbox" checked={roleForm.permissionKeys.includes(permission.key)} onChange={() => togglePermission(permission.key)} /> {labels[permission.action] || permission.action}</label>)}</div>)}</div>
        <button className="btn btn-primary">{editingRole ? 'Actualizar perfil' : 'Crear perfil'}</button>
      </form>
      <div className="table-wrap"><table><thead><tr><th>Perfil</th><th>Descripción</th><th>Usuarios</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{roles.map((role) => <tr key={role.id}><td>{role.name}</td><td>{role.description || '-'}</td><td>{role._count?.users || 0}</td><td>{role.active ? 'Activo' : 'Inactivo'}</td><td><button className="btn btn-secondary" onClick={() => { setEditingRole(role.id); setRoleForm({ name: role.name, description: role.description || '', active: role.active, permissionKeys: role.permissions.map(({ permission }) => permission.key) }); }}>Editar</button>{role.name !== 'ADMIN' && <button className="btn btn-danger" onClick={() => remove('role', role.id)}>Eliminar</button>}</td></tr>)}</tbody></table></div>
    </section>}
  </div>;
}
