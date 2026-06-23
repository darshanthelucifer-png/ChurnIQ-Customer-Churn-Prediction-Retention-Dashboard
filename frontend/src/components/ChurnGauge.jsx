import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './ChurnGauge.css';

const RADIUS = 80;
const STROKE = 14;
const CENTER = 100;
const CIRCUMFERENCE = Math.PI * RADIUS; // half-circle arc length

function getTierColor(prob) {
  if (prob >= 0.7) return 'var(--high-risk)';
  if (prob >= 0.4) return 'var(--medium-risk)';
  return 'var(--low-risk)';
}

/**
 * Animated SVG arc gauge showing churn probability percentage.
 * @param {{ probability: number, size?: number }} props
 */
export default function ChurnGauge({ probability = 0, size = 200 }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(probability), 100);
    return () => clearTimeout(timer);
  }, [probability]);

  const pct = Math.min(Math.max(animated, 0), 1);
  const offset = CIRCUMFERENCE - pct * CIRCUMFERENCE;
  const color = getTierColor(probability);
  const displayPct = Math.round(probability * 100);

  return (
    <div className="churn-gauge" style={{ width: size, height: size / 2 + 40 }}>
      <svg
        width={size}
        height={size / 2 + 20}
        viewBox="0 0 200 120"
        className="churn-gauge-svg"
      >
        {/* Track */}
        <path
          d={`M ${CENTER - RADIUS} ${CENTER} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${CENTER}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${CENTER - RADIUS} ${CENTER} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${CENTER}`}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.4s ease' }}
        />
        {/* Center text */}
        <text
          x={CENTER}
          y={CENTER - 6}
          textAnchor="middle"
          className="gauge-pct-text"
          fill={color}
        >
          {displayPct}%
        </text>
        <text
          x={CENTER}
          y={CENTER + 14}
          textAnchor="middle"
          className="gauge-label-text"
          fill="var(--text-muted)"
        >
          Churn Risk
        </text>
        {/* Min/Max labels */}
        <text x={CENTER - RADIUS + 4} y={CENTER + 22} className="gauge-minmax" fill="var(--text-muted)">0%</text>
        <text x={CENTER + RADIUS - 18} y={CENTER + 22} className="gauge-minmax" fill="var(--text-muted)">100%</text>
      </svg>
    </div>
  );
}

ChurnGauge.propTypes = {
  probability: PropTypes.number,
  size: PropTypes.number,
};