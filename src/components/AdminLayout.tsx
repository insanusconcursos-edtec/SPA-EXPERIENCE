import React, { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { 
  Sparkles, 
  LayoutDashboard, 
  CalendarDays, 
  Briefcase, 
  Users, 
  Clock, 
  LogOut, 
  Menu, 
  ArrowLeft,
  ChevronRight,
  Palette,
  Image as ImageIcon
} from 'lucide-react';
import { HeaderLogo } from './HeaderLogo';

interface AdminLayoutProps {
  adminEmail?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  adminEmail = 'admin@spaexperience.com'
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'Agendamentos', path: '/admin/agendamentos', icon: CalendarDays },
    { id: 'services', label: 'Serviços', path: '/admin/servicos', icon: Briefcase },
    { id: 'clients', label: 'Clientes', path: '/admin/clientes', icon: Users },
    { id: 'therapists', label: 'Massoterapeutas', path: '/admin/massoterapeutas', icon: Users },
    { id: 'schedules', label: 'Horários de Funcionamento', path: '/admin/horarios', icon: Clock },
    { id: 'banner', label: 'Banner do Catálogo', path: '/admin/banner', icon: ImageIcon },
    { id: 'logo', label: 'Logo & Marca', path: '/admin/logo', icon: Palette },
  ];

  // Active item determined dynamically by current URL path
  const activeItem = menuItems.find(item => location.pathname === item.path) || menuItems[2];
  const activeTab = activeItem.id;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBackToCatalog = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex selection:bg-[#D4AF37] selection:text-black">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-zinc-950 border-r border-zinc-900/60 z-50 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          {/* Logo Brand Header */}
          <div className="h-20 flex items-center px-6 border-b border-zinc-900/60 bg-black/45">
            <HeaderLogo variant="sidebar" onClick={handleBackToCatalog} />
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1.5 mt-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    isActive 
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-l-2 border-[#D4AF37]' 
                      : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Operations */}
        <div className="p-4 border-t border-zinc-900/60 space-y-2">
          <button
            onClick={handleBackToCatalog}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-[#D4AF37] transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Ver Catálogo</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-950/20 transition-all duration-300"
          >
            <LogOut className="h-4 w-4" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Top Control Header */}
        <header className="h-20 border-b border-zinc-900/60 bg-zinc-950/40 backdrop-blur-md flex items-center justify-between px-6 sm:px-8">
          
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="hidden lg:block text-xs font-bold text-zinc-500 uppercase tracking-widest">
            {menuItems.find(i => i.id === activeTab)?.label}
          </div>

          {/* Admin User Info Block */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Administrador Logado
              </span>
              <span className="block text-xs font-bold text-zinc-300">
                {adminEmail}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full border border-[#D4AF37]/35 bg-zinc-900/60 flex items-center justify-center text-[#D4AF37] shadow-gold-premium">
              <span className="text-xs font-black uppercase">AD</span>
            </div>
          </div>
        </header>

        {/* Scrollable Work Area */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.01)_0%,transparent_50%)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
