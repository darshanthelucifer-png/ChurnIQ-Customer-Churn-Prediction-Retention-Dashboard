/**
 * All API call functions, typed with JSDoc.
 */
import client from './client.js';

// ── Analytics ─────────────────────────────────────────────────────────────────

/**
 * @returns {Promise<import('./types').OverviewData>}
 */
export const fetchOverview = () =>
  client.get('/api/analytics/overview').then((r) => r.data);

// ── Customers ─────────────────────────────────────────────────────────────────

/**
 * @param {{ page?: number, limit?: number, risk_tier?: string, search?: string, sort_by?: string, order?: string }} params
 * @returns {Promise<import('./types').CustomerListResponse>}
 */
export const fetchCustomers = (params = {}) =>
  client.get('/api/customers', { params }).then((r) => r.data);

/**
 * @param {number} id
 * @returns {Promise<import('./types').CustomerDetail>}
 */
export const fetchCustomer = (id) =>
  client.get(`/api/customers/${id}`).then((r) => r.data);

/**
 * @param {number} id
 * @param {string} action_type
 * @returns {Promise<object>}
 */
export const createRetentionAction = (id, action_type) =>
  client.post(`/api/customers/${id}/actions`, { action_type }).then((r) => r.data);

// ── Predictions ───────────────────────────────────────────────────────────────

/**
 * @param {object} featurePayload
 * @returns {Promise<import('./types').PredictResponse>}
 */
export const predictChurn = (featurePayload) =>
  client.post('/api/predict', featurePayload).then((r) => r.data);

// ── Model ─────────────────────────────────────────────────────────────────────

/**
 * @returns {Promise<import('./types').ModelInfo>}
 */
export const fetchModelInfo = () =>
  client.get('/api/model/info').then((r) => r.data);

/**
 * @returns {Promise<import('./types').RocCurveData>}
 */
export const fetchRocCurve = () =>
  client.get('/api/model/roc-curve').then((r) => r.data);

/**
 * @returns {Promise<object>}
 */
export const retrainModel = () =>
  client.post('/api/model/retrain').then((r) => r.data);