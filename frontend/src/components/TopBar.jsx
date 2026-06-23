import React from 'react';
import PropTypes from 'prop-types';
import './TopBar.css';

/**
 * Page-level top bar showing title and optional subtitle/actions.
 * @param {{ title: string, subtitle?: string, children?: React.ReactNode }} props
 */
export default function TopBar({ title, subtitle, children }) {
  return (
    <header className="topbar">
      <div className="topbar-text">
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="topbar-actions">{children}</div>}
    </header>
  );
}

TopBar.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: PropTypes.node,
};