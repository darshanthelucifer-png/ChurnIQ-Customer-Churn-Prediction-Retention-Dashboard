import React, { useState, useRef, useCallback } from 'react';
import { Zap, ArrowUp, ArrowDown, Minus } from 'lucide-react';

import TopBar from '../components/TopBar.jsx';
import ChurnGauge from '../components/ChurnGauge.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import ShapChart from '../components/ShapChart.jsx';
import { usePrediction } from '../hooks/usePrediction.js';
import './PredictSimulate.css';

const DEFAULT_FORM = {
  gender: 'Male',
  senior_citizen: 0,
  partner: 'No',
  dependents: 'No',
  tenure: 12,
  phone_service: 'Yes',
  multiple_lines: 'No',
  internet_service: 'DSL',
  online_security: 'No',
  online_backup: 'No',
  device_protection: 'No',
  tech_support: 'No',
  streaming_tv: 'No',
  streaming_movies: 'No',
  contract: 'Month-to-month',
  paperless_billing: 'Yes',
  payment_method: 'Electronic check',
  monthly_charges: 65.0,
  total_charges: 780.0,
};

const SELECT_OPTIONS = {
  gender: ['Male', 'Female'],
  partner: ['Yes', 'No'],
  dependents: ['Yes', 'No'],
  phone_service: ['Yes', 'No'],
  multiple_lines: ['No phone service', 'No', 'Yes'],
  internet_service: ['DSL', 'Fiber optic', 'No'],
  online_security: ['No internet service', 'No', 'Yes'],
  online_backup: ['No internet service', 'No', 'Yes'],
  device_protection: ['No internet service', 'No', 'Yes'],
  tech_support: ['No internet service', 'No', 'Yes'],
  streaming_tv: ['No internet service', 'No', 'Yes'],
  streaming_movies: ['No internet service', 'No', 'Yes'],
  contract: ['Month-to-month', 'One year', 'Two year'],
  paperless_billing: ['Yes', 'No'],
  payment_method: [
    'Electronic check',
    'Mailed check',
    'Bank transfer (automatic)',
    'Credit card (automatic)',
  ],
};

const FORM_SECTIONS = [
  {
    title: 'Basic Info',
    fields: ['gender', 'senior_citizen', 'partner', 'dependents'],
  },
  {
    title: 'Services',
    fields: [
      'phone_service', 'multiple_lines', 'internet_service',
      'online_security', 'online_backup', 'device_protection',
      'tech_support', 'streaming_tv', 'streaming_movies',
    ],
  },
  {
    title: 'Billing',
    fields: [
      'contract', 'paperless_billing', 'payment_method',
      'monthly_charges', 'total_charges', 'tenure',
    ],
  },
];

function fieldLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PredictSimulate() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [simForm, setSimForm] = useState(DEFAULT_FORM);
  const [prevProb, setPrevProb] = useState(null);
  const { result, loading, error, predict } = usePrediction();
  const [simResult, setSimResult] = useState(null);
  const debounceRef = useRef(null);

  const handleChange = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPrevProb(result?.churn_prob ?? null);
    const res = await predict(form);
    if (res) setSimForm(form);
  };

  // What-if simulator debounced re-predict
  const handleSimChange = useCallback((key, value) => {
    const updated = { ...simForm, [key]: value };
    setSimForm(updated);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPrevProb(simResult?.churn_prob ?? result?.churn_prob ?? null);
      const res = await predict(updated);
      if (res) setSimResult(res);
    }, 400);
  }, [simForm, simResult, result, predict]);

  const displayResult = simResult || result;
  const delta = displayResult && prevProb !== null
    ? displayResult.churn_prob - prevProb
    : null;

  return (
    <>
      <TopBar
        title="Predict & Simulate"
        subtitle="Score a new customer and simulate what-if scenarios"
      />
      <div className="page-body">
        <div className="predict-grid">
          {/* ── Left: Form ── */}
          <div className="predict-form-col">
            <div className="card">
              <div className="card-header">
                <span className="card-title">New Customer Prediction</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {FORM_SECTIONS.map(({ title, fields }) => (
                    <div key={title} className="form-section">
                      <h3 className="form-section-title">{title}</h3>
                      <div className="form-fields-grid">
                        {fields.map((key) => (
                          <div key={key} className="form-group">
                            <label className="form-label">{fieldLabel(key)}</label>
                            {key === 'senior_citizen' ? (
                              <select
                                className="form-select"
                                value={form[key]}
                                onChange={(e) => handleChange(key, Number(e.target.value))}
                              >
                                <option value={0}>No</option>
                                <option value={1}>Yes</option>
                              </select>
                            ) : SELECT_OPTIONS[key] ? (
                              <select
                                className="form-select"
                                value={form[key]}
                                onChange={(e) => handleChange(key, e.target.value)}
                              >
                                {SELECT_OPTIONS[key].map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="number"
                                className="form-input"
                                value={form[key]}
                                step={key === 'monthly_charges' || key === 'total_charges' ? '0.01' : '1'}
                                min={0}
                                onChange={(e) => handleChange(key, parseFloat(e.target.value) || 0)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    style={{ marginTop: 8, justifyContent: 'center', padding: '11px' }}
                    disabled={loading}
                  >
                    {loading ? <span className="spinner" /> : <Zap size={15} />}
                    {loading ? 'Predicting...' : 'Predict Churn'}
                  </button>

                  {error && (
                    <p className="text-center" style={{ color: 'var(--high-risk)', marginTop: 10, fontSize: 13 }}>
                      {error}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* ── Right: Results ── */}
          <div className="predict-result-col">
            {!result && !loading && (
              <div className="empty-state card" style={{ padding: 60 }}>
                <Zap size={40} style={{ color: 'var(--primary)', marginBottom: 16 }} />
                <h3>Fill in the form and click Predict</h3>
                <p className="text-muted mt-4">Results will appear here with SHAP explanations.</p>
              </div>
            )}

            {(result || loading) && (
              <>
                {/* Gauge Card */}
                <div className="card mb-4">
                  <div className="card-body" style={{ textAlign: 'center' }}>
                    <ChurnGauge probability={displayResult?.churn_prob || 0} size={210} />
                    <div className="flex items-center justify-between mt-4">
                      <RiskBadge tier={displayResult?.risk_tier || 'Low'} />
                      {delta !== null && Math.abs(delta) > 0.001 && (
                        <div className={`delta-indicator ${delta > 0 ? 'delta--up' : 'delta--down'}`}>
                          {delta > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          {delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SHAP */}
                {displayResult?.shap_local?.length > 0 && (
                  <div className="card mb-4">
                    <div className="card-header"><span className="card-title">Key Factors</span></div>
                    <div className="card-body">
                      <ShapChart features={displayResult.shap_local} height={260} />
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {displayResult?.retention_suggestions?.length > 0 && (
                  <div className="card mb-4">
                    <div className="card-header"><span className="card-title">Retention Suggestions</span></div>
                    <div className="card-body">
                      <ul className="suggestion-list">
                        {displayResult.retention_suggestions.map((s, i) => (
                          <li key={i} className="suggestion-item">{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* What-if Simulator */}
                {result && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">What-If Simulator</span>
                    </div>
                    <div className="card-body">
                      <p className="text-muted mb-4" style={{ fontSize: 12 }}>
                        Adjust values to see how churn risk changes in real-time.
                      </p>

                      <div className="form-group">
                        <label className="form-label">Tenure: {simForm.tenure} months</label>
                        <input
                          type="range"
                          className="sim-slider"
                          min={1} max={72} step={1}
                          value={simForm.tenure}
                          onChange={(e) => handleSimChange('tenure', Number(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>1 mo</span><span>72 mo</span>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Monthly Charges: ${Number(simForm.monthly_charges).toFixed(0)}
                        </label>
                        <input
                          type="range"
                          className="sim-slider"
                          min={20} max={120} step={1}
                          value={simForm.monthly_charges}
                          onChange={(e) => handleSimChange('monthly_charges', Number(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>$20</span><span>$120</span>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Contract Type</label>
                        <select
                          className="form-select"
                          value={simForm.contract}
                          onChange={(e) => handleSimChange('contract', e.target.value)}
                        >
                          {SELECT_OPTIONS.contract.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}