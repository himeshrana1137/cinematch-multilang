import React from 'react';
import { Globe, Check } from 'lucide-react';

export const LANGUAGES = [
  { code: 'all', label: 'All Languages' },
  { code: 'en', label: 'Hollywood' },
  { code: 'hi', label: 'Bollywood/Hindi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'kn', label: 'Kannada' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
];

export default function LanguageSelector({ selectedLanguages, onToggleLanguage, onSelectAll }) {
  const isAll = selectedLanguages.length === 0 || selectedLanguages.includes('all');

  return (
    <div style={{ width: '100%', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <Globe size={16} color="var(--accent-violet)" />
          <span>Filter by Language / Industry</span>
        </div>
        {!isAll && (
          <button
            onClick={onSelectAll}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-gold)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'opacity 0.2s'
            }}
          >
            Reset to All
          </button>
        )}
      </div>

      <div className="chips-scroll-container">
        {LANGUAGES.map((lang) => {
          const isSelected = lang.code === 'all'
            ? isAll
            : !isAll && selectedLanguages.includes(lang.code);

          return (
            <button
              key={lang.code}
              onClick={() => {
                if (lang.code === 'all') {
                  onSelectAll();
                } else {
                  onToggleLanguage(lang.code);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.88rem',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                border: isSelected
                  ? '1px solid var(--accent-violet)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(124, 92, 255, 0.25) 0%, rgba(124, 92, 255, 0.12) 100%)'
                  : 'rgba(255, 255, 255, 0.04)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: isSelected ? '0 0 16px var(--accent-violet-glow)' : 'none',
              }}
            >
              {isSelected && <Check size={14} color="var(--accent-gold)" />}
              <span>{lang.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
