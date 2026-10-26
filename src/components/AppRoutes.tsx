import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ServiceCatalog } from './ServiceCatalog';
import { AuthContainer } from './AuthContainer';
import { AdminLayout } from './AdminLayout';
import { AdminServices } from './AdminServices';
import { AdminDashboard } from './AdminDashboard';
import { AdminTherapists } from './AdminTherapists';
import { AdminSchedules } from './AdminSchedules';
import { AdminAppointments } from './AdminAppointments';
import { AdminClients } from './AdminClients';
import { AdminPlaceholder } from './AdminPlaceholder';
import { AdminBranding } from './AdminBranding';
import { ProtectedRoute } from './ProtectedRoute';
import { TherapistPortal } from './TherapistPortal';

export const AppRoutes: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Public Catalog Route */}
      <Route path="/" element={<ServiceCatalog />} />

      {/* Authentication Route */}
      <Route 
        path="/auth" 
        element={
          <AuthContainer 
            onClose={() => navigate('/')} 
            onSuccess={() => {}} 
          />
        } 
      />

      {/* Protected Admin Routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute onlyAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Default route redirecting to services */}
        <Route index element={<Navigate to="servicos" replace />} />
        
        {/* Child Sub-Sections */}
        <Route path="servicos" element={<AdminServices />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="agendamentos" element={<AdminAppointments />} />
        <Route path="clientes" element={<AdminClients />} />
        <Route path="massoterapeutas" element={<AdminTherapists />} />
        <Route path="horarios" element={<AdminSchedules />} />
        <Route path="configuracoes" element={<AdminBranding />} />
        <Route path="banner" element={<Navigate to="/admin/configuracoes" replace />} />
        <Route path="logo" element={<Navigate to="/admin/configuracoes" replace />} />
      </Route>

      {/* Protected Therapist Portal Route */}
      <Route 
        path="/portal" 
        element={
          <ProtectedRoute onlyTherapist>
            <TherapistPortal />
          </ProtectedRoute>
        } 
      />

      {/* Fallback to Catalog */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
