import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Auto-dismissing toast notification component.
 * @param {{ messages: Array<{id: number, text: string, type: string}>, onDismiss: (id: number) => void }} props
 */
export default function Toast({ messages, onDismiss }) {
  return (
    <div className="toast-container">
      {messages.map((msg) => (
        <ToastItem key={msg.id} msg={msg} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ msg, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(msg.id), 4000);
    return () => clearTimeout(t);
  }, [msg.id, onDismiss]);

  return (
    <div
      className={`toast ${msg.type === 'error' ? 'toast-error' : 'toast-success'}`}
      onClick={() => onDismiss(msg.id)}
      style={{ cursor: 'pointer' }}
    >
      {msg.text}
    </div>
  );
}

Toast.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    text: PropTypes.string,
    type: PropTypes.string,
  })),
  onDismiss: PropTypes.func.isRequired,
};

ToastItem.propTypes = {
  msg: PropTypes.object.isRequired,
  onDismiss: PropTypes.func.isRequired,
};