import React, { useState } from 'react';
import { Globe, Info } from 'lucide-react';

export const CHIPS = [
  { id: 'all', label: 'All', queryValue: '' },
  { id: 'en', label: 'Hollywood', queryValue: 'en' },
  { id: 'hi', label: 'Bollywood/Hindi', queryValue: 'hi' },
  { id: 'gu', label: 'Gujarati', queryValue: 'gu' },
  { id: 'south_indian', label: 'South Indian', queryValue: 'ta,te,ml,kn' },
  { id: 'ta', label: 'Tamil', queryValue: 'ta' },
  { id: 'te', label: 'Telugu', queryValue: 'te' },
  { id: 'ml', label: 'Malayalam', queryValue: 'ml' },
  { id: 'kn', label: 'Kannada', queryValue: 'kn' },
];

export default function LanguageSelector({ activeChipId, onSelectChip }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ width: '100%', marginBottom: '20px' }}>
      {/* Shortened 11-12px Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: 'var(--text-secondary)',
        fontSize: '11.5px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: '8px'
      }}>
        <Globe size={14} color="var(--accent-violet)" />
        <span>Filter by cinema</span>
      </div>

      {/* Single-select Pill Chips with soft edge fade hint */}
      <div className="chips-scroll-wrapper" style={{ marginBottom: '8px' }}>
        <div className="chips-scroll-container">
          {CHIPS.map((chip) => {
            const isActive = chip.id === activeChipId;

            return (
              <button
                key={chip.id}
                onClick={() => onSelectChip(chip.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '38px',
                  minHeight: '38px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  border: isActive
                    ? '1px solid var(--accent-violet)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(124, 92, 255, 0.35) 0%, rgba(124, 92, 255, 0.2) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: isActive ? '0 0 14px var(--accent-violet-glow)' : 'none',
                }}
              >
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
        <div className="chips-scroll-fade-right" />
      </div>

      {/* Hybrid Info Line (12px) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: 'var(--text-muted)',
        position: 'relative',
        flexWrap: 'wrap',
      }}>
        <span>Hybrid recommendations: 70% content + 30% quality score</span>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label="Information on hybrid recommendations"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <Info size={13} color="var(--accent-violet)" />
          </button>

          {showTooltip && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: '280px',
              background: '#151520',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '12px',
              lineHeight: 1.45,
              color: '#d1d5db',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.9)',
              zIndex: 70,
            }}>
              CineMatch blends plot, cast, and genre TF-IDF matching with Bayesian IMDb quality ratings and popularity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
