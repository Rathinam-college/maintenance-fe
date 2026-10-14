import { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutDashboard, FileSpreadsheet, ListPlus, Settings, History, PieChart, LogOut, Shield } from 'lucide-react';
import DashboardView from './components/DashboardView';
import AdvancedDashboardView from './components/AdvancedDashboardView';
import SummaryView from './components/SummaryView';
import LedgerView from './components/LedgerView';
import AllocationView from './components/AllocationView';
import ExpenseHistoryView from './components/ExpenseHistoryView';
import LoginView from './components/LoginView';
import LogoIcon from './components/LogoIcon';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8005/api' : '/maintenance/api');

// Configure Axios interceptor globally BEFORE React components mount
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('mt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('mt_token');
      localStorage.removeItem('mt_refresh');
      localStorage.removeItem('mt_user');
      localStorage.removeItem('mt_is_admin');
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    return Promise.reject(error);
  }
);

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    return window.location.hash.replace('#', '') || 'dashboard';
  });
  const [theme, setTheme] = useState('bright');
  const [financialYears, setFinancialYears] = useState([]);
  const [activeFY, setActiveFY] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('mt_token'));

  // Listen for global unauthorized events to trigger logout
  useEffect(() => {
    const handleLogoutEvent = () => setIsAuthenticated(false);
    window.addEventListener('auth_unauthorized', handleLogoutEvent);
    return () => window.removeEventListener('auth_unauthorized', handleLogoutEvent);
  }, []);

  const fetchFinancialYears = async (newFyId = null) => {
    try {
      const res = await axios.get(`${API_URL}/financial_years/`);
      const data = res.data;
      setFinancialYears(data);
      
      if (newFyId) {
        const newlyCreated = data.find(fy => fy.id === newFyId);
        if (newlyCreated) setActiveFY(newlyCreated);
      } else if (!activeFY) {
        const active = data.find(fy => fy.is_active) || data[0];
        setActiveFY(active);
      }
    } catch (err) {
      console.error("Failed to fetch financial years", err);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFinancialYears();
    }
  }, [isAuthenticated]);

  // Sync activeTab with URL hash
  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // Listen for back/forward browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== activeTab) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('mt_token');
    localStorage.removeItem('mt_refresh');
    localStorage.removeItem('mt_user');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={(token) => setIsAuthenticated(true)} theme={theme} setTheme={setTheme} />;
  }

  return (
    <div className="min-h-screen flex transition-colors duration-500 ease-in-out bg-[var(--bg-base)]">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-24'} h-screen sticky top-0 theme-panel flex flex-col transition-all duration-300 ease-in-out border-r`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="cursor-pointer hover:opacity-80 p-1 transition-opacity flex-shrink-0"
              title="Toggle Navigation"
            >
              <LogoIcon className="w-14 h-11" />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-xl font-bold theme-text leading-tight">Budget Tracker</h1>
                <p className="text-xs theme-text-muted">Maintenance</p>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-hidden mt-0 pt-5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 py-3 rounded-lg transition-colors ${
              isSidebarOpen ? 'justify-start px-4' : 'justify-center'
            } ${
              activeTab === 'dashboard' ? 'theme-accent-bg text-white shadow-md' : 'theme-text-muted theme-hover'
            }`}
            title="Dashboard"
          >
            <div className="flex-shrink-0"><LayoutDashboard size={20} /></div>
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Dashboard</span>}
          </button>
          
          <button
            onClick={() => setActiveTab('summary')}
            className={`w-full flex items-center gap-3 py-3 rounded-lg transition-colors ${
              isSidebarOpen ? 'justify-start px-4' : 'justify-center'
            } ${
              activeTab === 'summary' ? 'theme-accent-bg text-white shadow-md' : 'theme-text-muted theme-hover'
            }`}
            title="Summary Report"
          >
            <div className="flex-shrink-0"><FileSpreadsheet size={20} /></div>
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Summary Report</span>}
          </button>

          <button
            onClick={() => setActiveTab('advanced')}
            className={`w-full flex items-center gap-3 py-3 rounded-lg transition-colors ${
              isSidebarOpen ? 'justify-start px-4' : 'justify-center'
            } ${
              activeTab === 'advanced' ? 'theme-accent-bg text-white shadow-md' : 'theme-text-muted theme-hover'
            }`}
            title="Analytics Dashboard"
          >
            <div className="flex-shrink-0"><PieChart size={20} /></div>
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Analytics Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`w-full flex items-center gap-3 py-3 rounded-lg transition-colors ${
              isSidebarOpen ? 'justify-start px-4' : 'justify-center'
            } ${
              activeTab === 'ledger' ? 'theme-accent-bg text-white shadow-md' : 'theme-text-muted theme-hover'
            }`}
            title="Data Entry Ledger"
          >
            <div className="flex-shrink-0"><ListPlus size={20} /></div>
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Data Entry Ledger</span>}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 py-3 rounded-lg transition-colors ${
              isSidebarOpen ? 'justify-start px-4' : 'justify-center'
            } ${
              activeTab === 'history' ? 'theme-accent-bg text-white shadow-md' : 'theme-text-muted theme-hover'
            }`}
            title="Expense History"
          >
            <div className="flex-shrink-0"><History size={20} /></div>
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Expense History</span>}
          </button>

          <button
            onClick={() => setActiveTab('allocations')}
            className={`w-full flex items-center gap-3 py-3 rounded-lg transition-colors ${
              isSidebarOpen ? 'justify-start px-4' : 'justify-center'
            } ${
              activeTab === 'allocations' ? 'theme-accent-bg text-white shadow-md' : 'theme-text-muted theme-hover'
            }`}
            title="Budget Allocations"
          >
            <div className="flex-shrink-0"><Settings size={20} /></div>
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Budget Allocations</span>}
          </button>
        </nav>

        {localStorage.getItem('mt_is_admin') === 'true' && (
          <div className="px-4 mt-2">
            <a
              href={API_URL.replace('/api', '') + '/admin/'}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center gap-3 py-3 rounded-lg transition-colors theme-text-muted hover:text-indigo-500 hover:bg-indigo-50/5 ${
                isSidebarOpen ? 'justify-start px-4' : 'justify-center'
              }`}
              title="Admin Dashboard"
            >
              <div className="flex-shrink-0"><Shield size={20} /></div>
              {isSidebarOpen && <span className="font-medium whitespace-nowrap">Admin Tools</span>}
            </a>
          </div>
        )}

        {/* Bottom Row: Theme & Logout */}
        <div className={`p-4 border-t theme-border mt-2 flex gap-2 ${isSidebarOpen ? 'flex-row' : 'flex-col items-center'}`}>
          <button 
            onClick={() => setTheme(
              theme === 'bright' ? 'dark' : 
              theme === 'dark' ? 'adobe3d' : 
              theme === 'adobe3d' ? '3dsurface' : 
              theme === '3dsurface' ? 'glass' : 
              theme === 'glass' ? 'two-reflections' :
              theme === 'two-reflections' ? 'dark-glass' :
              theme === 'dark-glass' ? 'rathinam-light' :
              theme === 'rathinam-light' ? 'rathinam-dark' : 'bright'
            )}
            className={`flex items-center justify-center rounded-lg theme-hover transition-all border theme-border shadow-sm ${isSidebarOpen ? 'flex-1 p-3' : 'p-3 w-12'}`}
            title={`Current Theme: ${theme}`}
          >
            <div className={`w-5 h-5 flex-shrink-0 rounded-full border-2 theme-border ${
              theme === 'bright' ? 'bg-white' : 
              theme === 'dark' ? 'bg-gray-800' : 
              theme === 'adobe3d' ? 'bg-slate-300' : 
              theme === '3dsurface' ? 'bg-neutral-600' : 
              theme === 'glass' ? 'bg-indigo-500' :
              theme === 'two-reflections' ? 'bg-blue-300' :
              theme === 'dark-glass' ? 'bg-cyan-400' :
              theme === 'rathinam-light' ? 'bg-purple-600' :
              theme === 'rathinam-dark' ? 'bg-purple-900' : 'bg-indigo-500'
            }`}></div>
            {isSidebarOpen && (
              <span className="font-medium theme-text whitespace-nowrap text-[11px] ml-2 truncate">
                {theme === 'bright' && 'Bright'}
                {theme === 'dark' && 'Dark'}
                {theme === 'adobe3d' && 'Matte'}
                {theme === '3dsurface' && '3D Surf'}
                {theme === 'glass' && 'Glass'}
                {theme === 'two-reflections' && '2 Reflect'}
                {theme === 'dark-glass' && 'Neon'}
                {theme === 'rathinam-light' && 'RGU L'}
                {theme === 'rathinam-dark' && 'RGU D'}
              </span>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className={`flex items-center justify-center rounded-lg transition-colors theme-text-muted hover:text-red-500 border theme-border shadow-sm theme-hover ${isSidebarOpen ? 'flex-1 p-3' : 'p-3 w-12'}`}
            title="Logout"
          >
            <LogOut size={18} />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap text-[11px] ml-2">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header with FY Selector */}
        <header className="bg-transparent h-16 flex items-center justify-end px-8 flex-shrink-0">
          {financialYears.length > 0 && (
            <div className="flex items-center gap-3 bg-black/5 px-4 py-2 rounded-lg theme-border border">
              <span className="text-sm font-semibold theme-text-muted">Financial Year:</span>
              <select 
                value={activeFY?.id || ''}
                onChange={(e) => setActiveFY(financialYears.find(fy => fy.id === parseInt(e.target.value)))}
                className="bg-transparent font-bold theme-text focus:outline-none cursor-pointer"
              >
                {financialYears.map(fy => (
                  <option key={fy.id} value={fy.id} className="text-black">{fy.label}</option>
                ))}
              </select>
            </div>
          )}
        </header>
        
        {/* View Area */}
        <div className="flex-1 overflow-auto p-8 pt-0">
          {activeTab === 'dashboard' && <DashboardView activeFY={activeFY} />}
          {activeTab === 'advanced' && <AdvancedDashboardView activeFY={activeFY} />}
          {activeTab === 'summary' && <SummaryView activeFY={activeFY} />}
          {activeTab === 'ledger' && <LedgerView activeFY={activeFY} />}
          {activeTab === 'history' && <ExpenseHistoryView activeFY={activeFY} />}
          {activeTab === 'allocations' && <AllocationView activeFY={activeFY} refreshFinancialYears={fetchFinancialYears} />}
        </div>
      </main>
    </div>
  );
}

export default App;
