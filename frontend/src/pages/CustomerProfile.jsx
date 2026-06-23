import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Clock } from 'lucide-react';

import TopBar from '../components/TopBar.jsx';
import ChurnGauge from '../components/ChurnGauge.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import ShapChart from '../components/ShapChart.jsx';
import RetentionPanel from '../components/RetentionPanel.jsx';
import Toast from '../components/Toast.jsx';
import { fetchCustomer } from '../api/endpoints.js';
import './CustomerProfile.css';

let toastId = 0;

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setLoading(true);
    fetchCustomer(Number(id))
      .then((data) => { setCustomer(data); setError(null); })
      .catch(() => setError('Customer not found or server error.'))
      .finally(() => setLoading(false));
  }, [id]);

  const addToast = (text, type = 'success') => {
    const newToast = { id: ++toastId, text, type };
    setToasts((p) => [...p, newToast]);
  };
  const dismissToast = (tid) => setToasts((p) => p.filter((t) => t.id !== tid));

  // Parse SHAP from latest prediction
  const latestPred = customer?.predictions?.[0];
  let shapLocal = [];
  if (latestPred?.shap_json) {
    try { shapLocal = JSON.parse(latestPred.shap_json); } catch { shapLocal = []; }
  }

  const churnDrivers = shapLocal.filter((f) => f.direction === 'increases_churn');
  const protectors = shapLocal.filter((f) => f.direction === 'decreases_churn');

  if (loading) {
    return (
      <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span className="spinner spinner-lg" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-body empty-state">
        <p>{error || 'Customer not found.'}</p>
        <button className="btn btn-outline mt-4" onClick={() => navigate('/customers')}>
          Back to Customers
        </button>
      </div>
    );
  }

  const infoFields = [
    { label: 'Contract', value: customer.contract },
    { label: 'Internet Service', value: customer.internet_service },
    { label: 'Monthly Charges', value: `$${customer.monthly_charges?.toFixed(2)}` },
    { label: 'Total Charges', value: `$${customer.total_charges?.toFixed(2)}` },
    { label: 'Payment Method', value: customer.payment_method },
    { label: 'Paperless Billing', value: customer.paperless_billing },
    { label: 'Tech Support', value: customer.tech_support },
    { label: 'Senior Citizen', value: customer.senior_citizen ? 'Yes' : 'No' },
  ];

  return (
    <>
      <TopBar
        title="Customer Profile"
        subtitle={`Detailed risk analysis for ${customer.name}`}
      >
        <button className="btn btn-outline" onClick={() => navigate('/customers')}>
          <ArrowLeft size={14} /> Back
        </button>
      </TopBar>

      <div className="page-body">
        <div className="profile-grid">
          {/* ── Left Column ── */}
          <div className="profile-left">
            {/* Identity Card */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="profile-identity">
                  <div className="profile-avatar">
                    {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h2 style={{ marginBottom: 4 }}>{customer.name}</h2>
                    <p className="text-secondary" style={{ fontSize: 13 }}>{customer.email}</p>
                    <div className="flex items-center gap-2 mt-4">
                      <span className="tenure-badge"><Clock size={12} /> {customer.tenure} months</span>
                      <span className="text-muted" style={{ fontSize: 12 }}>tenure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="card mb-4">
              <div className="card-header"><span className="card-title">Account Details</span></div>
              <div className="card-body">
                <div className="info-grid">
                  {infoFields.map(({ label, value }) => (
                    <div key={label} className="info-item">
                      <span className="info-label">{label}</span>
                      <span className="info-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prediction History */}
            <div className="card">
              <div className="card-header"><span className="card-title">Prediction History</span></div>
              <div className="card-body">
                {customer.predictions.length === 0 ? (
                  <p className="text-muted">No predictions yet.</p>
                ) : (
                  <div className="pred-timeline">
                    {customer.predictions.map((p) => (
                      <div key={p.id} className="pred-timeline-item">
                        <div className="pred-timeline-dot" />
                        <div className="pred-timeline-content">
                          <span className="pred-score">
                            {(p.churn_prob * 100).toFixed(1)}%
                          </span>
                          <RiskBadge tier={p.risk_tier} size="sm" />
                          <span className="text-muted" style={{ fontSize: 11 }}>
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="profile-right">
            {/* Gauge + Risk */}
            <div className="card mb-4">
              <div className="card-body" style={{ textAlign: 'center' }}>
                <ChurnGauge probability={customer.churn_prob || 0} size={220} />
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <p className="text-muted" style={{ fontSize: 12 }}>Risk Tier</p>
                    <RiskBadge tier={customer.risk_tier} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="text-muted" style={{ fontSize: 12 }}>Last Scored</p>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>
                      {customer.last_predicted_at
                        ? new Date(customer.last_predicted_at).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Churn Drivers */}
            <div className="card mb-4">
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--high-risk)' }}>
                  ↑ Why Is This Customer at Risk?
                </span>
              </div>
              <div className="card-body">
                {churnDrivers.length > 0 ? (
                  <ShapChart features={churnDrivers} height={200} />
                ) : (
                  <p className="text-muted">No risk factors available.</p>
                )}
              </div>
            </div>

            {/* Protective Factors */}
            <div className="card mb-4">
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--low-risk)' }}>
                  ↓ Factors Protecting Against Churn
                </span>
              </div>
              <div className="card-body">
                {protectors.length > 0 ? (
                  <ShapChart features={protectors} height={200} />
                ) : (
                  <p className="text-muted">No protective factors available.</p>
                )}
              </div>
            </div>

            {/* Retention Actions */}
            <div className="card">
              <div className="card-header"><span className="card-title">Retention Actions</span></div>
              <div className="card-body">
                <RetentionPanel customerId={customer.id} onToast={addToast} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast messages={toasts} onDismiss={dismissToast} />
    </>
  );
}