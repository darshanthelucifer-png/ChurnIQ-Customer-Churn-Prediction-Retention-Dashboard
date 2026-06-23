import React from 'react';
import PropTypes from 'prop-types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import './ShapChart.css';

/**
 * Horizontal bar chart showing SHAP feature impacts.
 * @param {{ features: Array<{feature: string, impact: number, direction: string}>, height?: number }} props
 */
export default function ShapChart({ features = [], height = 240 }) {
  if (!features.length) {
    return <p className="text-muted text-center">No SHAP data available.</p>;
  }

  const data = features.map((f) => ({
    name: f.feature.replace(/^(binary__|multi__|numeric__)/, '').replace(/_/g, ' '),
    impact: f.impact,
    direction: f.direction,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="shap-tooltip">
        <p className="shap-tooltip-name">{d.name}</p>
        <p className="shap-tooltip-val">Impact: {d.impact.toFixed(4)}</p>
        <p className="shap-tooltip-dir">{d.direction === 'increases_churn' ? '↑ Increases churn' : '↓ Reduces churn'}</p>
      </div>
    );
  };

  return (
    <div className="shap-chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.direction === 'increases_churn' ? 'var(--high-risk)' : 'var(--low-risk)'}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

ShapChart.propTypes = {
  features: PropTypes.arrayOf(
    PropTypes.shape({
      feature: PropTypes.string,
      impact: PropTypes.number,
      direction: PropTypes.string,
    })
  ),
  height: PropTypes.number,
};