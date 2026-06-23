import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Phone, Tag, ArrowUpCircle, Mail, CheckCircle } from 'lucide-react';
import { createRetentionAction } from '../api/endpoints.js';
import './RetentionPanel.css';

const ACTIONS = [
  {
    key: 'discount_offer',
    label: 'Send Discount',
    description: 'Offer a personalized pricing discount',
    icon: Tag,
    colorClass: 'action--blue',
  },
  {
    key: 'personal_call',
    label: 'Schedule Call',
    description: 'Book a 1-on-1 retention call',
    icon: Phone,
    colorClass: 'action--green',
  },
  {
    key: 'upgrade_offer',
    label: 'Offer Upgrade',
    description: 'Present a feature upgrade proposal',
    icon: ArrowUpCircle,
    colorClass: 'action--purple',
  },
  {
    key: 'email_campaign',
    label: 'Email Campaign',
    description: 'Add to re-engagement drip sequence',
    icon: Mail,
    colorClass: 'action--amber',
  },
];

/**
 * Panel of retention action buttons for a customer profile.
 * @param {{ customerId: number, onToast: (msg: string, type: string) => void }} props
 */
export default function RetentionPanel({ customerId, onToast }) {
  const [loading, setLoading] = useState({});
  const [done, setDone] = useState({});

  const handleAction = async (key) => {
    setLoading((p) => ({ ...p, [key]: true }));
    try {
      await createRetentionAction(customerId, key);
      setDone((p) => ({ ...p, [key]: true }));
      onToast?.(`Action "${key.replace(/_/g, ' ')}" logged successfully.`, 'success');
      setTimeout(() => setDone((p) => ({ ...p, [key]: false })), 4000);
    } catch {
      onToast?.('Failed to log action. Please try again.', 'error');
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  return (
    <div className="retention-panel">
      {ACTIONS.map(({ key, label, description, icon: Icon, colorClass }) => (
        <button
          key={key}
          className={`retention-action ${colorClass} ${done[key] ? 'action--done' : ''}`}
          onClick={() => handleAction(key)}
          disabled={loading[key]}
        >
          <span className="action-icon">
            {done[key] ? <CheckCircle size={18} /> : <Icon size={18} />}
          </span>
          <span className="action-text">
            <span className="action-label">{done[key] ? 'Logged!' : label}</span>
            <span className="action-desc">{description}</span>
          </span>
          {loading[key] && <span className="spinner" style={{ marginLeft: 'auto' }} />}
        </button>
      ))}
    </div>
  );
}

RetentionPanel.propTypes = {
  customerId: PropTypes.number.isRequired,
  onToast: PropTypes.func,
};