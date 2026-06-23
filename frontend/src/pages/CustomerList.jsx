import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import TopBar from '../components/TopBar.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import { useCustomers } from '../hooks/useCustomers.js';
import './CustomerList.css';

const RISK_TIERS = ['All', 'High', 'Medium', 'Low'];
const SORT_OPTIONS = [
  { value: 'churn_prob', label: 'Churn Prob' },
  { value: 'tenure', label: 'Tenure' },
  { value: 'monthly_charges', label: 'Monthly Charges' },
  { value: 'name', label: 'Name' },
];

export default function CustomerList() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const { customers, total, loading, error, filters, setFilters, page, setPage } = useCustomers();

  const totalPages = Math.ceil(total / filters.limit);

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
    // Debounce via setState — triggers useEffect on filters change
    clearTimeout(window._searchTimeout);
    window._searchTimeout = setTimeout(() => {
      setFilters({ search: e.target.value });
    }, 350);
  };

  const handleSort = (field) => {
    if (filters.sort_by === field) {
      setFilters({ order: filters.order === 'desc' ? 'asc' : 'desc' });
    } else {
      setFilters({ sort_by: field, order: 'desc' });
    }
  };

  const SortIcon = ({ field }) => {
    if (filters.sort_by !== field) return null;
    return filters.order === 'desc'
      ? <ChevronDown size={13} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
      : <ChevronUp size={13} style={{ verticalAlign: 'middle', marginLeft: 4 }} />;
  };

  return (
    <>
      <TopBar
        title="Customers"
        subtitle={`${total.toLocaleString()} customers · showing page ${page} of ${totalPages || 1}`}
      />
      <div className="page-body">
        {/* Filter Bar */}
        <div className="filter-bar card mb-4">
          <div className="filter-search">
            <Search size={15} className="filter-search-icon" />
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search name or email..."
              value={searchInput}
              onChange={handleSearch}
            />
          </div>

          <div className="filter-controls">
            <label className="filter-label">Risk Tier</label>
            <div className="tier-filter-buttons">
              {RISK_TIERS.map((t) => (
                <button
                  key={t}
                  className={`tier-filter-btn ${(filters.risk_tier || 'All') === t ? 'tier-filter-btn--active' : ''}`}
                  onClick={() => setFilters({ risk_tier: t === 'All' ? '' : t })}
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="filter-label">Sort By</label>
            <select
              className="form-select"
              style={{ width: 160 }}
              value={filters.sort_by}
              onChange={(e) => setFilters({ sort_by: e.target.value })}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <button
              className="btn btn-outline"
              onClick={() => setFilters({ order: filters.order === 'desc' ? 'asc' : 'desc' })}
            >
              {filters.order === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {filters.order === 'desc' ? 'Desc' : 'Asc'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {error && <p className="text-center text-muted p-4">{error}</p>}
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')}>
                    Name <SortIcon field="name" />
                  </th>
                  <th>Email</th>
                  <th onClick={() => handleSort('tenure')}>
                    Tenure <SortIcon field="tenure" />
                  </th>
                  <th>Contract</th>
                  <th onClick={() => handleSort('monthly_charges')}>
                    Monthly $ <SortIcon field="monthly_charges" />
                  </th>
                  <th onClick={() => handleSort('churn_prob')}>
                    Churn Prob <SortIcon field="churn_prob" />
                  </th>
                  <th>Risk</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center" style={{ padding: 40 }}>
                      <span className="spinner" />
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted" style={{ padding: 40 }}>
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="customer-row" onClick={() => navigate(`/customers/${c.id}`)}>
                      <td>
                        <div className="customer-name-cell">
                          <div className="avatar-sm">{c.name.charAt(0)}</div>
                          <span className="font-semibold">{c.name}</span>
                        </div>
                      </td>
                      <td className="text-secondary">{c.email}</td>
                      <td>{c.tenure} mo</td>
                      <td>{c.contract}</td>
                      <td>${c.monthly_charges?.toFixed(2)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar-track" style={{ width: 80 }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${(c.churn_prob || 0) * 100}%`,
                                background:
                                  c.risk_tier === 'High' ? 'var(--high-risk)'
                                    : c.risk_tier === 'Medium' ? 'var(--medium-risk)'
                                    : 'var(--low-risk)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, minWidth: 36 }}>
                            {((c.churn_prob || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td><RiskBadge tier={c.risk_tier} size="sm" /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => navigate(`/customers/${c.id}`)}
                        >
                          Profile →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span className="pagination-info">
              {total} results · Page {page} of {totalPages || 1}
            </span>
            <div className="pagination-controls">
              <button
                className="btn btn-outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={15} /> Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + Math.max(1, page - 2);
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    className={`btn ${p === page ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 10px', minWidth: 36 }}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="btn btn-outline"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}