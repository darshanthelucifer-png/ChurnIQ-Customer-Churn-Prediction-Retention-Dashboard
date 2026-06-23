import React from 'react';
import PropTypes from 'prop-types';
import './RiskBadge.css';

const TIER_CLASS = {
  High: 'badge--high',
  Medium: 'badge--medium',
  Low: 'badge--low',
};

/**
 * Colored pill badge for churn risk tier.
 * @param {{ tier: string, size?: 'sm' | 'md' }} props
 */
export default function RiskBadge({ tier, size = 'md' }) {
  if (!tier) return null;
  const cls = TIER_CLASS[tier] || 'badge--low';
  return (
    <span className={`risk-badge ${cls} ${size === 'sm' ? 'risk-badge--sm' : ''}`}>
      {tier}
    </span>
  );
}

RiskBadge.propTypes = {
  tier: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md']),
};