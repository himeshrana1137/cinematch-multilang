import React from 'react';
import { Sparkles, Smile, Zap, Heart, Ghost, Users, Compass, Activity, SmilePlus } from 'lucide-react';

export const MOODS = [
  { id: null, label: 'Any mood', icon: Sparkles },
  { id: 'Feel-good', label: 'Feel-good', icon: Smile },
  { id: 'Thrilling', label: 'Thrilling', icon: Zap },
  { id: 'Romantic', label: 'Romantic', icon: Heart },
  { id: 'Scary', label: 'Scary', icon: Ghost },
  { id: 'Family night', label: 'Family night', icon: Users },
  { id: 'Mind-bending', label: 'Mind-bending', icon: Compass },
  { id: 'Emotional', label: 'Emotional', icon: Activity },
];

export default function MoodSelector({ activeMood, onSelectMood, moodCounts = {} }) {
  return (
    <div style={{ width: '100%', marginBottom: '16px' }}>
      {/* Mood Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: 'var(--text-secondary)',
        fontSize: '11.5px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        <SmilePlus size={14} color="var(--accent-gold)" />
        <span>Select your mood</span>
      </div>

      {/* Horizontally scrollable mood chips */}
      <div className="chips-scroll-wrapper">
        <div className="chips-scroll-container">
          {MOODS.map((mood) => {
            const isActive = activeMood === mood.id;
            const IconComponent = mood.icon;
            const count = mood.id ? moodCounts[mood.id] : null;

            return (
              <button
                key={mood.label}
                type="button"
                onClick={() => onSelectMood(mood.id)}
                aria-pressed={isActive}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '40px',
                  minHeight: '40px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  border: isActive
                    ? '1px solid var(--accent-gold)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(245, 185, 66, 0.28) 0%, rgba(124, 92, 255, 0.25) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: isActive ? '0 0 14px rgba(245, 185, 66, 0.35)' : 'none',
                }}
              >
                <IconComponent
                  size={15}
                  color={isActive ? 'var(--accent-gold)' : 'var(--text-secondary)'}
                  style={{ flexShrink: 0 }}
                />
                <span>{mood.label}</span>
                {typeof count === 'number' && count > 0 && (
                  <span style={{
                    fontSize: '0.72rem',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    marginLeft: '2px',
                    opacity: 0.85,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="chips-scroll-fade-right" />
      </div>
    </div>
  );
}
