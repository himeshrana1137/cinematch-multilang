import React from 'react';
import { Star, Film, Eye, Sparkles } from 'lucide-react';

export default function MovieCard({ movie, onSelect, onOpenDetails, isSelected }) {
  if (!movie) return null;

  const matchPercent = movie.match_percent;
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = matchPercent
    ? circumference - (circumference * matchPercent) / 100
    : circumference;

  return (
    <div
      className="glass-card snap-item movie-card"
      style={{
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        border: isSelected ? '2px solid var(--accent-violet)' : '1px solid var(--border-card)',
        boxShadow: isSelected ? '0 0 24px var(--accent-violet-glow)' : 'none',
      }}
      onClick={() => onSelect(movie)}
    >
      {/* 2:3 Poster Container */}
      <div className="movie-card-poster-wrap">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="movie-card-poster-img"
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a24',
            color: 'var(--text-secondary)',
            padding: '16px',
            textAlign: 'center'
          }}>
            <Film size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <span style={{ fontSize: '0.8rem' }}>{movie.title}</span>
          </div>
        )}

        {/* Language Badge */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 5,
          background: 'rgba(10, 10, 15, 0.82)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 'var(--radius-pill)',
          padding: '3px 8px',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#e2d9ff',
          letterSpacing: '0.02em',
        }}>
          {movie.language_name}
        </div>

        {/* Circular SVG Match Ring (if match_percent available) */}
        {typeof matchPercent === 'number' && (
          <div className="match-ring-badge" title={`${matchPercent}% Match`}>
            <svg width="40" height="40" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background Track */}
              <circle
                cx="20"
                cy="20"
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="3"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="20"
                cy="20"
                r={radius}
                fill="transparent"
                stroke="url(#matchGradient)"
                strokeWidth="3.2"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
              <defs>
                <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c5cff" />
                  <stop offset="100%" stopColor="#f5b942" />
                </linearGradient>
              </defs>
            </svg>
            <span style={{
              position: 'absolute',
              fontSize: '0.62rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em'
            }}>
              {matchPercent}%
            </span>
          </div>
        )}

        {/* Hover overlay gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to top, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.5) 45%, transparent 100%)',
          opacity: 0,
          transition: 'opacity 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '14px',
          zIndex: 6,
        }}
        className="card-hover-overlay"
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(movie);
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Eye size={13} />
              Details
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(movie);
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'var(--accent-violet)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={13} color="var(--accent-gold)" />
              Match
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#e5e7eb', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {movie.overview}
          </div>
        </div>
      </div>

      {/* Card Info Below Poster */}
      <div style={{ padding: '12px 6px 4px 6px' }}>
        <h3 style={{
          fontSize: '0.92rem',
          fontWeight: 600,
          color: '#ffffff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '4px'
        }}>
          {movie.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
          <span>{movie.year || '—'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--accent-gold)', fontWeight: 600 }}>
            <Star size={12} fill="var(--accent-gold)" color="var(--accent-gold)" />
            <span>{movie.tmdb_rating ? movie.tmdb_rating.toFixed(1) : 'NR'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
