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
    <div style={{ width: '100%', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '10px' }}>
        <Globe size={16} color="var(--accent-violet)" />
        <span>Filter by Cinema / Industry</span>
      </div>

      {/* Single-select Pill Chips */}
      <div className="chips-scroll-container" style={{ marginBottom: '10px' }}>
        {CHIPS.map((chip) => {
          const isActive = chip.id === activeChipId;

          return (
            <button
              key={chip.id}
              onClick={() => onSelectChip(chip.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 20px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.88rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                border: isActive
                  ? '1px solid var(--accent-violet)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(124, 92, 255, 0.3) 0%, rgba(124, 92, 255, 0.15) 100%)'
                  : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 0 16px var(--accent-violet-glow)' : 'none',
              }}
            >
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* Small Tasteful Info Line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', position: 'relative' }}>
        <span>Hybrid recommendations: 70% similarity (story, cast, genre) + 30% rating and popularity</span>
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
            <Info size={14} color="var(--accent-violet)" />
          </button>

          {showTooltip && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '290px',
              background: '#151520',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.78rem',
              lineHeight: 1.45,
              color: '#d1d5db',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.9)',
              zIndex: 70,
              pointerEvents: 'none',
            }}>
              CineMatch blends plot, cast, and genre TF-IDF matching with Bayesian IMDb quality ratings and popularity. This ensures you discover contextually relevant recommendations without sacrificing film quality.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
