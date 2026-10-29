import React from 'react';
import { Shuffle, Loader2 } from 'lucide-react';

export default function SurpriseButton({ onSurprise, loading, fullWidth = false }) {
  return (
    <button
      type="button"
      onClick={onSurprise}
      disabled={loading}
      aria-label="Surprise me with a random movie recommendation"
      className="btn-secondary surprise-btn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: '44px',
        height: '44px',
        padding: '0 18px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '0.86rem',
        fontWeight: 600,
        cursor: loading ? 'wait' : 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        width: fullWidth ? '100%' : 'auto',
        background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.25) 0%, rgba(245, 185, 66, 0.2) 100%)',
        border: '1px solid rgba(124, 92, 255, 0.4)',
        color: '#ffffff',
        boxShadow: '0 4px 14px rgba(124, 92, 255, 0.25)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.borderColor = 'var(--accent-gold)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 185, 66, 0.35)';
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.borderColor = 'rgba(124, 92, 255, 0.4)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(124, 92, 255, 0.25)';
        }
      }}
    >
      {loading ? (
        <Loader2 size={16} color="var(--accent-gold)" className="spin-animate" />
      ) : (
        <Shuffle size={16} color="var(--accent-gold)" />
      )}
      <span>{loading ? 'Finding a gem...' : 'Surprise me'}</span>
    </button>
  );
}
