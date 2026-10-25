import React, { useState, useEffect } from 'react';
import { Sliders, Info } from 'lucide-react';

export default function HybridControl({ alpha, onAlphaChange }) {
  const [localAlpha, setLocalAlpha] = useState(alpha);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setLocalAlpha(alpha);
  }, [alpha]);

  const contentWeight = Math.round(localAlpha * 100);
  const qualityWeight = 100 - contentWeight;

  const handleRelease = () => {
    if (localAlpha !== alpha) {
      onAlphaChange(localAlpha);
    }
  };

  return (
    <div className="glass-card" style={{
      padding: '20px 24px',
      marginBottom: '32px',
      background: 'linear-gradient(135deg, rgba(24, 24, 36, 0.8) 0%, rgba(18, 18, 26, 0.95) 100%)',
      border: '1px solid rgba(124, 92, 255, 0.25)',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(124, 92, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sliders size={18} color="var(--accent-violet)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>
              Recommendation Balance Engine
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Tune the hybrid blend between storyline &amp; cast similarity vs. global rating &amp; popularity
            </p>
          </div>
        </div>

        {/* Live Weight Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(124, 92, 255, 0.15)',
            border: '1px solid var(--accent-violet)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#c4b5fd'
          }}>
            Content: {contentWeight}%
          </div>
          <div style={{
            background: 'rgba(245, 185, 66, 0.15)',
            border: '1px solid var(--accent-gold)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--accent-gold)'
          }}>
            Popularity &amp; Rating: {qualityWeight}%
          </div>

          {/* Info Tooltip */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              aria-label="How hybrid scoring works"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <Info size={18} />
            </button>

            {showTooltip && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '300px',
                background: '#151520',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '0.78rem',
                lineHeight: 1.5,
                color: '#d1d5db',
                boxShadow: '0 12px 30px rgba(0,0,0,0.8)',
                zIndex: 60,
              }}>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '4px' }}>How Hybrid Scoring Works:</strong>
                Final Score = <em>α × Content</em> + <em>(1 - α) × Quality</em>.<br />
                • <strong>Content:</strong> TF-IDF over genres (3x), keywords (2x), director, cast &amp; plot.<br />
                • <strong>Quality:</strong> Bayesian rating from votes &amp; log popularity.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slider Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c4b5fd', minWidth: '95px' }}>
          More Similar
        </span>

        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.05"
          value={localAlpha}
          onChange={(e) => setLocalAlpha(parseFloat(e.target.value))}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
          onKeyUp={handleRelease}
          style={{
            flex: 1,
            accentColor: '#7c5cff',
            cursor: 'pointer',
            height: '6px',
            borderRadius: '4px',
          }}
        />

        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-gold)', minWidth: '95px', textAlign: 'right' }}>
          More Popular
        </span>
      </div>
    </div>
  );
}
