import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

import TopBar from '../components/TopBar.jsx';
import { fetchModelInfo, fetchRocCurve, retrainModel } from '../api/endpoints.js';
import './ModelInsights.css';

export default function ModelInsights() {
  const [modelInfo, setModelInfo] = useState(null);
  const [rocData, setRocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [info, roc] = await Promise.all([fetchModelInfo(), fetchRocCurve()]);
      setModelInfo(info);
      setRocData(roc);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load model info.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainMsg(null);
    try {
      const res = await retrainModel();
      setRetrainMsg({ text: `Retrained! Best model: ${res.best_model} — ROC-AUC: ${res.roc_auc}`, type: 'success' });
      await load();
    } catch (e) {
      setRetrainMsg({ text: e?.response?.data?.detail || 'Retrain failed.', type: 'error' });
    } finally {
      setRetraining(false);
    }
  };

  // ROC diagonal reference data
  const diagonal = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

  const rocChartData = rocData
    ? rocData.fpr.map((fpr, i) => ({ fpr: rocData.fpr[i], tpr: rocData.tpr[i] }))
    : [];

  const cm = modelInfo?.confusion_matrix || [[0, 0], [0, 0]];
  const [tn, fp] = cm[0] || [0, 0];
  const [fn, tp] = cm[1] || [0, 0];

  const otherModel = modelInfo
    ? (modelInfo.best_model_name === 'XGBoost' ? 'RandomForest' : 'XGBoost')
    : '';

  return (
    <>
      <TopBar
        title="Model Insights"
        subtitle="Performance metrics, feature importance, and ROC analysis"
      >
        <button
          className="btn btn-primary"
          onClick={handleRetrain}
          disabled={retraining}
        >
          {retraining ? <span className="spinner" /> : <RefreshCw size={14} />}
          {retraining ? 'Retraining...' : 'Retrain Model'}
        </button>
      </TopBar>

      <div className="page-body">
        {retrainMsg && (
          <div className={`retrain-msg ${retrainMsg.type === 'success' ? 'retrain-success' : 'retrain-error'}`}>
            {retrainMsg.text}
          </div>
        )}

        {error && (
          <div className="empty-state">
            <p>{error}</p>
            <p className="text-muted mt-4">Run <code>python train.py</code> first.</p>
          </div>
        )}

        {loading && (
          <div className="text-center p-4"><span className="spinner spinner-lg" /></div>
        )}

        {!loading && modelInfo && (
          <>
            {/* Model Comparison Table */}
            <div className="card mb-6">
              <div className="card-header">
                <span className="card-title">Model Comparison</span>
                {modelInfo.trained_at && (
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    Last trained: {new Date(modelInfo.trained_at).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, borderTop: '1px solid var(--border)' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>ROC-AUC</th>
                      <th>F1 Score</th>
                      <th>Recall</th>
                      <th>Precision</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-semibold">{modelInfo.best_model_name}</td>
                      <td><MetricPill value={modelInfo.roc_auc} /></td>
                      <td><MetricPill value={modelInfo.f1} /></td>
                      <td><MetricPill value={modelInfo.recall} /></td>
                      <td><MetricPill value={modelInfo.precision} /></td>
                      <td>
                        <span className="status-badge status-active">
                          <CheckCircle size={11} /> Active
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-semibold">{otherModel}</td>
                      <td><span className="text-muted">—</span></td>
                      <td><span className="text-muted">—</span></td>
                      <td><span className="text-muted">—</span></td>
                      <td><span className="text-muted">—</span></td>
                      <td>
                        <span className="status-badge status-inactive">
                          <XCircle size={11} /> Inactive
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feature Importance + ROC row */}
            <div className="grid-2 mb-6">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Top 15 Feature Importances</span>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart
                      data={modelInfo.feature_importances.slice(0, 15)}
                      layout="vertical"
                      margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        width={170}
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      />
                      <Tooltip
                        formatter={(v) => [v.toFixed(4), 'Importance']}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="importance" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">ROC Curve</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    AUC = {modelInfo.roc_auc}
                  </span>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart
                      data={rocChartData}
                      margin={{ top: 8, right: 16, bottom: 24, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="fpr"
                        type="number"
                        domain={[0, 1]}
                        label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -12, fontSize: 11, fill: 'var(--text-muted)' }}
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        tickCount={6}
                      />
                      <YAxis
                        dataKey="tpr"
                        domain={[0, 1]}
                        label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--text-muted)' }}
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        tickCount={6}
                      />
                      <Tooltip
                        formatter={(v, n) => [v.toFixed(3), n === 'tpr' ? 'TPR' : 'FPR']}
                        contentStyle={{ fontSize: 12 }}
                      />
                      {/* Diagonal reference */}
                      <Line
                        data={diagonal}
                        dataKey="y"
                        stroke="var(--border)"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="tpr"
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Confusion Matrix */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Confusion Matrix</span>
                <span className="text-muted" style={{ fontSize: 12 }}>Threshold = 0.5</span>
              </div>
              <div className="card-body">
                <div className="cm-wrapper">
                  <div className="cm-axis-label cm-axis-label--x">Predicted</div>
                  <div className="cm-axis-label cm-axis-label--y">Actual</div>
                  <table className="confusion-matrix">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Predicted No Churn</th>
                        <th>Predicted Churn</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>Actual No Churn</th>
                        <td className="cm-tn">
                          <div className="cm-cell-value">{tn}</div>
                          <div className="cm-cell-label">True Negative</div>
                        </td>
                        <td className="cm-fp">
                          <div className="cm-cell-value">{fp}</div>
                          <div className="cm-cell-label">False Positive</div>
                        </td>
                      </tr>
                      <tr>
                        <th>Actual Churn</th>
                        <td className="cm-fn">
                          <div className="cm-cell-value">{fn}</div>
                          <div className="cm-cell-label">False Negative</div>
                        </td>
                        <td className="cm-tp">
                          <div className="cm-cell-value">{tp}</div>
                          <div className="cm-cell-label">True Positive</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Small colored metric pill */
function MetricPill({ value }) {
  const color = value >= 0.8 ? 'var(--low-risk)' : value >= 0.65 ? 'var(--medium-risk)' : 'var(--high-risk)';
  return (
    <span style={{ fontWeight: 600, color }}>{(value * 100).toFixed(1)}%</span>
  );
}