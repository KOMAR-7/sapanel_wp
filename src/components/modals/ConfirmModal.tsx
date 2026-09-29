'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  impactWarning?: string;
  confirmWord?: string; // If supplied, user must type this exact string
  confirmButtonText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  impactWarning,
  confirmWord,
  confirmButtonText = 'Confirm Action',
  isDestructive = true,
  isLoading = false,
}: ConfirmModalProps) {
  const [typedWord, setTypedWord] = useState('');

  if (!isOpen) return null;

  const requiresTyping = Boolean(confirmWord);
  const canConfirm = !requiresTyping || typedWord.trim().toLowerCase() === confirmWord?.trim().toLowerCase();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: isDestructive ? 'var(--status-red-bg)' : 'var(--status-yellow-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDestructive ? 'var(--status-red)' : 'var(--status-yellow)',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline btn-sm"
            style={{ padding: '6px', border: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
          {description}
        </p>

        {impactWarning && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid var(--status-red-border)',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--status-red)', marginBottom: '4px' }}>
              Potential Service Impact:
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#fca5a5', lineHeight: 1.4 }}>
              {impactWarning}
            </div>
          </div>
        )}

        {requiresTyping && (
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontSize: '0.8125rem' }}>
              To verify this dangerous action, please type <span className="code-pill">{confirmWord}</span> below:
            </label>
            <input
              type="text"
              className="form-input"
              value={typedWord}
              onChange={(e) => setTypedWord(e.target.value)}
              placeholder={`Type "${confirmWord}"`}
              autoFocus
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || isLoading}
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
          >
            {isLoading ? 'Processing...' : confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
