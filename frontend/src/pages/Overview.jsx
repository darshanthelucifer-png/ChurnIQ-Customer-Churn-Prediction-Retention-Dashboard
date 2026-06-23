import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Users, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';

import TopBar from '../components/TopBar.jsx';
import MetricCard from '../components/MetricCard.jsx';
import TrendChart from '../components/TrendChart.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { useCustomers } from '../hooks/useCustomers.js';
import './Overview.css';

const PIE_COLORS = {
  High: 'var(--high-risk)',
  Medium: 'var(--medium-risk)',
  Low: 'var(--low-risk)',
};

export default function Overview() {
  const { data, loading, error } = useAnalytics();
  const { customers: topRisk } = useCustomers({ sort_by: 'churn_prob', order: 'desc', limit: 10 });
  const navigate = useNavigate();

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'High', value: data.high_risk_count },
      { name: 'Medium', value: data.medium_risk_count },
      { name: 'Low', value: data.low_risk_count },
    ];
  }, [data]);

  const mrrAtRisk = useMemo(() => {
    if (!data || !topRisk.length) return 0;
    const avgMonthly = topRisk.reduce((s, c) => s + (c.monthly_charges || 0), 0) / topRisk.length || 65;
    return Math.round(data.high_risk_count * avgMonthly);
  }, [data, topRisk]);

  if (error) {
    return (
      <div className="page-body">
        <div className="empty-state">
          <AlertTriangle size={40} className="risk-high" />
          <p className="mt-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar
        title="Overview"
        subtitle="Real-time churn risk intelligence across your customer base"
      />
      <div className="page-body">
        {/* KPI Cards */}
        <div className="grid-4 mb-6">
          <MetricCard
            label="Total Customers"
            value={loading ? '—' : (data?.total_customers || 0).toLocaleString()}
            icon={<Users size={18} />}
          />
          <MetricCard
            label="High Risk"
            value={loading ? '—' : (data?.high_risk_count || 0).toLocaleString()}
            icon={<AlertTriangle size={18} />}
            accentClass="metric--danger"
          />
          <MetricCard
            label="Avg Churn Rate"
            value={loading ? '—' : `${((data?.avg_churn_prob || 0) * 100).toFixed(1)}%`}
            icon={<TrendingUp size={18} />}
          />
          <MetricCard
            label="MRR at Risk"
            value={loading ? '—' : `$${mrrAtRisk.toLocaleString()}`}
            icon={<DollarSign size={18} />}
            accentClass="metric--danger"
          />
        </div>

        {/* Trend Chart */}
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Churn Rate Trend (Last 6 Months)</span>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center p-4"><span className="spinner spinner-lg" /></div>
            ) : (
              <TrendChart data={data?.churn_trend || []} height={260} />
            )}
          </div>
        </div>

        {/* Pie + Bar row */}
        <div className="grid-2 mb-6">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Risk Tier Distribution</span>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center p-4"><span className="spinner" /></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Customers']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Churn Rate by Contract Type</span>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center p-4"><span className="spinner" /></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data?.top_risk_segments || []}
                    margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="segment_name"
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                      tickLine={false}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <Tooltip
                      formatter={(v) => [`${(v * 100).toFixed(1)}%`, 'Avg Churn Prob']}
                    />
                    <Bar dataKey="avg_prob" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Top 10 highest risk */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top 10 Highest Risk Customers</span>
          </div>
          <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Monthly Charges</th>
                  <th>Contract</th>
                  <th>Risk Tier</th>
                  <th>Churn Prob</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {topRisk.slice(0, 10).map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.name}</td>
                    <td>${c.monthly_charges?.toFixed(2)}</td>
                    <td>{c.contract}</td>
                    <td><RiskBadge tier={c.risk_tier} size="sm" /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar-track" style={{ width: 80 }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${(c.churn_prob || 0) * 100}%`,
                              background: c.risk_tier === 'High' ? 'var(--high-risk)' : c.risk_tier === 'Medium' ? 'var(--medium-risk)' : 'var(--low-risk)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {((c.churn_prob || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '5px 12px', fontSize: 12 }}
                        onClick={() => navigate(`/customers/${c.id}`)}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
                {!topRisk.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: 40 }}>
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}