import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Zap,
  BarChart2,
  Settings,
  TrendingDown,
} from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/predict', label: 'Predict', icon: Zap },
  { path: '/model', label: 'Model Insights', icon: BarChart2 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Persistent sidebar navigation with active state highlighting.
 */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <TrendingDown className="sidebar-logo-icon" size={22} />
        <span className="sidebar-logo-text">ChurnIQ</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
            }
          >
            <Icon size={18} />
            <span className="sidebar-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="text-muted" style={{ fontSize: '11px' }}>
          v1.0.0
        </span>
      </div>
    </aside>
  );
}