import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EquipmentPage from './pages/EquipmentPage';
import EquipmentDetailPage from './pages/EquipmentDetailPage';
import EquipmentFormPage from './pages/EquipmentFormPage';
import InvoiceAuditPage from './pages/InvoiceAuditPage';
import AreasPage from './pages/AreasPage';
import SchedulePage from './pages/SchedulePage';
import AccessControlPage from './pages/AccessControlPage';
import {
  ContractsPage,
  DicomPage,
  LicensesPage,
  QualityPage,
  ReportsPage,
} from './pages/ModulePages';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="card" style={{ margin: '2rem' }}>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="equipos" element={<EquipmentPage />} />
            <Route path="equipos/nuevo" element={<EquipmentFormPage />} />
            <Route path="equipos/:id" element={<EquipmentDetailPage />} />
            <Route path="equipos/:id/editar" element={<EquipmentFormPage />} />
            <Route path="areas" element={<AreasPage />} />
            <Route path="cronograma" element={<SchedulePage />} />
            <Route path="licencias" element={<LicensesPage />} />
            <Route path="contratos" element={<ContractsPage />} />
            <Route path="calidad" element={<QualityPage />} />
            <Route path="dicom" element={<DicomPage />} />
            <Route path="reportes" element={<ReportsPage />} />
            <Route path="auditoria-facturas" element={<InvoiceAuditPage />} />
            <Route path="perfiles-usuario" element={<AccessControlPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
