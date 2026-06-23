import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './TrendChart.css';

/**
 * Line chart for churn rate trend over time.
 * @param {{ data: Array<{month: string, churn_rate: number}>, height?: number }} props
 */
export default function TrendChart({ data = [], height = 240 }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="trend-tooltip">
        <p className="trend-tooltip-label">{label}</p>
        <p className="trend-tooltip-val">{payload[0].value.toFixed(1)}% churn rate</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="churn_rate"
          stroke="var(--primary)"
          strokeWidth={2.5}
          dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

TrendChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      month: PropTypes.string,
      churn_rate: PropTypes.number,
    })
  ),
  height: PropTypes.number,
};