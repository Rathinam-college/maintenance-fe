import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { IndianRupee, TrendingDown, Target, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8005/api' : '/maintenance/api');

export default function DashboardView({ activeFY }) {
  const [data, setData] = useState({
    total_budget: 0,
    total_spent: 0,
    balance: 0,
    utilisation: 0,
    categories: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const fyId = activeFY?.id || '';
      const res = await axios.get(`${API_URL}/dashboard/?fy_id=${fyId}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeFY]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold theme-text">Budget Overview</h2>
        <button onClick={fetchDashboard} className="px-4 py-2 theme-panel rounded-lg hover:opacity-80 theme-text text-sm font-medium transition-opacity">
          Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="theme-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium theme-text-muted mb-1">Total Budget</p>
            <h3 className="text-2xl font-bold theme-text">{formatCurrency(data.total_budget)}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Target size={24} />
          </div>
        </div>

        <div className="theme-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium theme-text-muted mb-1">Total Spent</p>
            <h3 className="text-2xl font-bold text-red-500">{formatCurrency(data.total_spent)}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="theme-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium theme-text-muted mb-1">Balance</p>
            <h3 className="text-2xl font-bold text-green-500">{formatCurrency(data.balance)}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="theme-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium theme-text-muted mb-1">Utilisation</p>
            <h3 className="text-2xl font-bold theme-text">{data.utilisation.toFixed(1)}%</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* Sub-Category Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="theme-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-blue-500">
          <div>
            <p className="text-sm font-medium theme-text-muted mb-1">Actual Spends</p>
            <h3 className="text-xl font-bold theme-text">{formatCurrency(data.sub_categories?.ACTUAL || 0)}</h3>
          </div>
        </div>
        <div className="theme-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-yellow-500">
          <div>
            <p className="text-sm font-medium theme-text-muted mb-1">Additional Work</p>
            <h3 className="text-xl font-bold theme-text">{formatCurrency(data.sub_categories?.ADDITIONAL || 0)}</h3>
          </div>
        </div>
        <div className="theme-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-gray-500">
          <div>
            <p className="text-sm font-medium theme-text-muted mb-1">Others</p>
            <h3 className="text-xl font-bold theme-text">{formatCurrency(data.sub_categories?.OTHERS || 0)}</h3>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Category Table */}
        <div className="theme-panel rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b theme-border">
            <h3 className="text-lg font-bold theme-text">Category-Wise Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b theme-border opacity-80">
                  <th className="px-6 py-4 text-sm font-semibold theme-text">Category</th>
                  <th className="px-6 py-4 text-sm font-semibold theme-text">Sanctioned</th>
                  <th className="px-6 py-4 text-sm font-semibold theme-text">Spent</th>
                  <th className="px-6 py-4 text-sm font-semibold theme-accent-text">Balance</th>
                  <th className="px-6 py-4 text-sm font-semibold theme-text">% Used</th>
                  <th className="px-6 py-4 text-sm font-semibold theme-text">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {data.categories.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center theme-text-muted">No categories found. Add categories in admin panel.</td></tr>
                ) : data.categories.map((cat) => (
                  <tr key={cat.id} className="theme-hover transition-colors">
                    <td className="px-6 py-4 font-medium theme-text">{cat.name}</td>
                    <td className="px-6 py-4 theme-text-muted">{formatCurrency(cat.sanctioned)}</td>
                    <td className="px-6 py-4 theme-text-muted">{formatCurrency(cat.spent)}</td>
                    <td className={`px-6 py-4 font-medium ${(cat.sanctioned - cat.spent) < 0 ? 'text-red-500' : 'theme-accent-text'}`}>
                      {formatCurrency(cat.sanctioned - cat.spent)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${cat.perc_used > 80 ? 'bg-red-500' : cat.perc_used > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                            style={{ width: `${Math.min(cat.perc_used, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-8">{cat.perc_used.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {cat.status === 'On Track' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500 border border-green-500/30"><CheckCircle size={12}/> On Track</span>}
                      {cat.status === 'Not Started' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">Not Started</span>}
                      {cat.status === 'Monitor' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">Monitor</span>}
                      {cat.status === 'Alert' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-500 border border-orange-500/30"><AlertTriangle size={12}/> Alert</span>}
                      {cat.status === 'Overrun' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500 border border-red-500/30"><AlertTriangle size={12}/> Overrun</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="theme-panel p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-bold theme-text mb-6">Monthly Expenditure Trend</h3>
          <div className="h-80 w-full" style={{ minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              {data.monthly_trend && data.monthly_trend.length > 0 ? (
                <LineChart data={data.monthly_trend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-divider)" opacity={0.5} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                    tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{ stroke: 'var(--border-divider)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-divider)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [formatCurrency(value), 'Spent']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_amount" 
                    name="Spent" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-surface)' }} 
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }} 
                  />
                </LineChart>
              ) : (
                <div className="h-full flex items-center justify-center theme-text-muted">No monthly expenditure data available.</div>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Custom Table Legend */}
          {data.monthly_trend && data.monthly_trend.length > 0 && (
            <div className="mt-8 overflow-x-auto border theme-border rounded-lg">
              <table className="w-full text-center text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b theme-border bg-blue-50/5">
                    <th className="px-4 py-3 font-semibold theme-text text-left border-r theme-border w-40">Month</th>
                    {data.monthly_trend.map((m, idx) => (
                      <th key={idx} className="px-4 py-3 font-semibold theme-text">{m.month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  <tr className="theme-hover transition-colors">
                    <td className="px-4 py-3 font-semibold theme-text text-left border-r theme-border">Actual Spend (₹)</td>
                    {data.monthly_trend.map((m, idx) => (
                      <td key={idx} className="px-4 py-3 font-medium theme-text-muted">{formatCurrency(m.total_amount)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
