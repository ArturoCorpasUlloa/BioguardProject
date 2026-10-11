import styles from './MainLayout.module.css';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCog,
  Shield,
  Stethoscope,
  Moon,
  Sun,
  X,
  Database,
  ReceiptText,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { downloadSqlExport } from '../services/api';

const navItems = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true, permission: 'dashboard.view' },
  { to: '/equipos', label: 'Equipos', icon: Stethoscope, permission: 'equipment.view' },
  { to: '/areas', label: 'Áreas', icon: ClipboardList, permission: 'areas.view' },
  { to: '/cronograma', label: 'Cronograma', icon: CalendarDays, permission: 'schedule.view' },
  { to: '/licencias', label: 'Licencias', icon: Shield, permission: 'licenses.view' },
  { to: '/contratos', label: 'Contratos', icon: FileText, permission: 'contracts.view' },
  { to: '/calidad', label: 'Calidad', icon: ClipboardList, permission: 'quality_controls.view' },
  { to: '/dicom', label: 'AETitle / IP', icon: MonitorCog, permission: 'dicom.view' },
  { to: '/reportes', label: 'Reportes', icon: Activity, permission: 'reports.view' },
  { to: '/auditoria-facturas', label: 'Auditoría de facturas', icon: ReceiptText, permission: 'invoice_audits.view' },
  { to: '/perfiles-usuario', label: 'Perfiles de usuario', icon: Shield, permission: 'roles.view' },
];

export default function MainLayout() {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('bioguard_theme') || 'light');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  async function handleSqlExport() {
    setExporting(true);
    setExportError('');
    try {
      await downloadSqlExport();
    } catch (error) {
      setExportError(error.message);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('bioguard_theme', theme);
  }, [theme]);

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.brand}>
          <div className={styles.logo}>BG</div>
          <div>
            <strong>BioGuard</strong>
            <span>Gestión biomédica</span>
          </div>
          <button
            className={styles.themeButton}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'}
            title={theme === 'light' ? 'Tema oscuro' : 'Tema claro'}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button className={styles.closeMobile} onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.filter(({ permission }) => can(permission)).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {user?.role?.name?.toUpperCase() === 'ADMIN' && (
          <button className={styles.sqlExportButton} onClick={handleSqlExport} disabled={exporting}>
            <Database size={18} />
            <span>{exporting ? 'Exportando SQL...' : 'Exportar SQL'}</span>
          </button>
        )}

        <div className={styles.userBox}>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.role?.name}</span>
          </div>
          <button className={styles.logout} onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <button
            className={styles.themeButton}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <div>
            <strong>Sistema integral de equipos biomédicos</strong>
            <span>Centraliza hojas de vida, mantenimientos y reportes</span>
          </div>
        </header>
        {exportError && <div className="card error-message">{exportError}</div>}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
