import React from 'react';
import PropTypes from 'prop-types';
import './MetricCard.css';

/**
 * KPI summary card with icon, value, label, and optional trend.
 * @param {{ label: string, value: string|number, icon: React.ReactNode, trend?: string, trendUp?: boolean, accentClass?: string }} props
 */
export default function MetricCard({ label, value, icon, trend, trendUp, accentClass }) {
  return (
    <div className={`metric-card card ${accentClass || ''}`}>
      <div className="metric-card-header">
        <span className="metric-card-label">{label}</span>
        <span className="metric-card-icon">{icon}</span>
      </div>
      <div className="metric-card-value">{value}</div>
      {trend && (
        <div className={`metric-card-trend ${trendUp ? 'trend--up' : 'trend--down'}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.node,
  trend: PropTypes.string,
  trendUp: PropTypes.bool,
  accentClass: PropTypes.string,
};