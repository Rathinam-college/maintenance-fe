import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import '../dashboard.css';

ChartJS.register(
  ArcElement,
  ChartTooltip,
  ChartLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

ChartJS.defaults.color = '#64748b';
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.font.size = 11;

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8005/api' : '/maintenance/api');

export default function AdvancedDashboardView({ activeFY }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const fyId = activeFY?.id || '';
        const res = await axios.get(`${API_URL}/dashboard/?fy_id=${fyId}`);
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [activeFY]);

  if (loading || !data) {
    return <div className="flex h-64 items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const fmtK = (n) => n >= 100000 ? '₹' + (n/100000).toFixed(2) + 'L' : '₹' + Number(n).toLocaleString('en-IN');
  
  const totalSanctioned = data.total_budget || 0;
  const totalSpent = data.total_spent || 0;
  const totalOpex = data.total_opex || 0;
  const totalCapex = data.total_capex || 0;
  const utilPct = totalSanctioned > 0 ? ((totalSpent/totalSanctioned)*100).toFixed(1) : 0;
  const remaining = data.balance || 0;

  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}
      <div className="header">
        <div className="header-left">
          <div className="eyebrow">Analytics & Insights</div>
          <h1>Advanced <span>Budget</span> Dashboard</h1>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-label">Total Sanctioned</div>
          <div className="kpi-value">{fmtK(totalSanctioned)}</div>
          <div className="kpi-sub">FY {data.financial_year} · {data.categories?.length || 0} categories</div>
          <div className="kpi-accent-bar" style={{width:'100%',background:'#3b82f6',opacity:'.7'}}></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Spent YTD</div>
          <div className="kpi-value">{fmtK(totalSpent)}</div>
          <div className="kpi-sub">{utilPct}% utilised</div>
          <div className="kpi-accent-bar" style={{width:'100%',background:'#06b6d4',opacity:'.7'}}></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Remaining Budget</div>
          <div className="kpi-value">{fmtK(remaining)}</div>
          <div className="kpi-sub">{(100-parseFloat(utilPct)).toFixed(1)}% available</div>
          <div className="kpi-accent-bar" style={{width:'100%',background:'#10b981',opacity:'.7'}}></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">OPEX Spend</div>
          <div className="kpi-value">{fmtK(totalOpex)}</div>
          <div className="kpi-sub">{totalSpent > 0 ? ((totalOpex/totalSpent)*100).toFixed(1) : 0}% of total spend</div>
          <div className="kpi-accent-bar" style={{width:'100%',background:'#06b6d4',opacity:'.7'}}></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">CAPEX Spend</div>
          <div className="kpi-value">{fmtK(totalCapex)}</div>
          <div className="kpi-sub">{totalSpent > 0 ? ((totalCapex/totalSpent)*100).toFixed(1) : 0}% of total spend</div>
          <div className="kpi-accent-bar" style={{width:'100%',background:'#8b5cf6',opacity:'.7'}}></div>
        </div>
      </div>

      <div className="section-divider"><span>Budget Utilisation</span></div>

      {/* ROW 1 */}
      <div className="grid-3">
        {/* Progress Bars */}
        <div className="dash-card" style={{'--accent-color': 'var(--accent-cyan)'}}>
          <div className="card-header">
            <span className="card-title">Budget vs Actual · By Category</span>
          </div>
          <div className="progress-row overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
            {(data.categories || []).map(cat => {
              const pct = cat.sanctioned > 0 ? Math.min((cat.spent/cat.sanctioned)*100, 100).toFixed(1) : 0;
              const color = cat.is_capex ? '#8b5cf6' : '#06b6d4';
              const warn = parseFloat(pct) > 80 ? '#f43f5e' : parseFloat(pct) > 60 ? '#f59e0b' : color;
              const shortName = cat.name.length > 30 ? cat.name.substring(0,28)+'…' : cat.name;
              return (
                <div key={cat.id} className="prog-item">
                  <div className="prog-header">
                    <span className="prog-name">{shortName}</span>
                    <span className="prog-pct" style={{color:warn}}>{pct}%</span>
                  </div>
                  <div className="prog-bar-bg">
                    <div className="prog-bar-fill" style={{width:`${pct}%`,background:warn}}></div>
                  </div>
                  <div className="prog-amounts">
                    <span>Spent: {fmtK(cat.spent)}</span>
                    <span>Budget: {fmtK(cat.sanctioned)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="dash-card" style={{'--accent-color': 'var(--accent-violet)'}}>
          <div className="card-header">
            <span className="card-title">OPEX vs CAPEX Split</span>
            <span className="card-tag tag-info">Spend Mix</span>
          </div>
          <div className="chart-wrap">
            <Doughnut 
              data={{
                labels: ['OPEX', 'CAPEX'],
                datasets: [{
                  data: [totalOpex, totalCapex],
                  backgroundColor: ['rgba(6,182,212,.8)','rgba(139,92,246,.8)'],
                  borderColor: ['#06b6d4','#8b5cf6'],
                  borderWidth: 1,
                  hoverOffset: 6
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => ` ${ctx.label}: ${fmtK(ctx.raw)} (${totalSpent > 0 ? ((ctx.raw/totalSpent)*100).toFixed(1) : 0}%)`
                    }
                  }
                }
              }}
            />
          </div>
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{background:'#06b6d4'}}></div>OPEX — {fmtK(totalOpex)}</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'#8b5cf6'}}></div>CAPEX — {fmtK(totalCapex)}</div>
          </div>
        </div>

        {/* Sub-Category Bar */}
        <div className="dash-card" style={{'--accent-color': 'var(--accent-amber)'}}>
          <div className="card-header">
            <span className="card-title">Sub-Category Breakdown</span>
            <span className="card-tag tag-info">₹ Actual</span>
          </div>
          <div className="chart-wrap">
            <Bar 
              data={{
                labels: ['ACTUAL', 'ADDITIONAL', 'OTHERS'],
                datasets: [{
                  label: 'Amount',
                  data: [
                    data.sub_categories?.ACTUAL || 0, 
                    data.sub_categories?.ADDITIONAL || 0, 
                    data.sub_categories?.OTHERS || 0
                  ],
                  backgroundColor: ['rgba(16,185,129,.7)','rgba(245,158,11,.7)','rgba(244,63,94,.7)'],
                  borderColor: ['#10b981','#f59e0b','#f43f5e'],
                  borderWidth: 1,
                  borderRadius: 4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: ctx => ' ₹' + ctx.raw.toLocaleString('en-IN') } }
                },
                scales: {
                  x: { grid: { color: 'rgba(30,39,64,.5)' }, ticks: { color: '#64748b' } },
                  y: { grid: { color: 'rgba(30,39,64,.5)' }, ticks: { color: '#64748b', callback: v => '₹'+v.toLocaleString('en-IN') } }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid-2">
        {/* Monthly Summary */}
        <div className="dash-card" style={{'--accent-color': 'var(--accent-blue)'}}>
          <div className="card-header">
            <span className="card-title">Monthly Spend Summary</span>
            <span className="card-tag tag-info">FY {data.financial_year}</span>
          </div>
          <div className="month-grid">
            {(data.monthly_trend || []).slice(-3).map(m => (
              <div key={m.month} className="month-tile">
                <div className="mt-label">{m.month}</div>
                <div className="mt-amount">{fmtK(m.total_amount)}</div>
                <div className="mt-count">{m.count} transaction{m.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop: '14px'}}>
            <div className="chart-wrap">
              <Bar 
                data={{
                  labels: (data.monthly_trend || []).map(m => m.month),
                  datasets: [{
                    label: 'Monthly Spend',
                    data: (data.monthly_trend || []).map(m => m.total_amount),
                    backgroundColor: 'rgba(59,130,246,.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ' ₹' + ctx.raw.toLocaleString('en-IN') } }
                  },
                  scales: {
                    x: { grid: { color: 'rgba(30,39,64,.5)' }, ticks: { color: '#64748b' } },
                    y: { grid: { color: 'rgba(30,39,64,.5)' }, ticks: { color: '#64748b', callback: v => '₹'+(v/1000).toFixed(0)+'K' } }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Category Horizontal Bar */}
        <div className="dash-card" style={{'--accent-color': 'var(--accent-green)'}}>
          <div className="card-header">
            <span className="card-title">Spend by Category</span>
            <span className="card-tag tag-info">Total ₹</span>
          </div>
          <div className="chart-wrap-tall overflow-y-auto pr-2 custom-scrollbar">
            <Bar 
              data={{
                labels: (data.categories || []).map(c => c.name.length > 25 ? c.name.substring(0, 23) + '…' : c.name),
                datasets: [
                  {
                    label: 'Spent',
                    data: (data.categories || []).map(c => c.spent),
                    backgroundColor: (data.categories || []).map(c => c.is_capex ? 'rgba(139,92,246,.7)' : 'rgba(6,182,212,.7)'),
                    borderColor: (data.categories || []).map(c => c.is_capex ? '#8b5cf6' : '#06b6d4'),
                    borderWidth: 1,
                    borderRadius: 4
                  },
                  {
                    label: 'Budget',
                    data: (data.categories || []).map(c => c.sanctioned),
                    backgroundColor: 'rgba(30,39,64,.6)',
                    borderColor: 'rgba(100,116,139,.3)',
                    borderWidth: 1,
                    borderRadius: 4
                  }
                ]
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top', labels: { color: '#64748b', boxWidth: 10, font: { size: 10 } } },
                  tooltip: { callbacks: { label: ctx => ' ₹' + ctx.raw.toLocaleString('en-IN') } }
                },
                scales: {
                  x: { grid: { color: 'rgba(30,39,64,.5)' }, ticks: { color: '#64748b', callback: v => '₹'+(v/100000).toFixed(1)+'L' } },
                  y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
