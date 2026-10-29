import React from 'react';
import { Star, Film, Eye, Sparkles, Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

export default function MovieCard({ movie, onSelect, onOpenDetails, isSelected }) {
  if (!movie) return null;

  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(movie.id);

  const matchPercent = movie.match_percent;
  const radius = 13;
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
            padding: '12px',
            textAlign: 'center'
          }}>
            <Film size={28} style={{ marginBottom: '6px', opacity: 0.5 }} />
            <span style={{ fontSize: '0.75rem', lineHeight: 1.2 }}>{movie.title}</span>
          </div>
        )}

        {/* Language Badge */}
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          zIndex: 5,
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 'var(--radius-pill)',
          padding: '2px 7px',
          fontSize: '0.68rem',
          fontWeight: 600,
          color: '#e2d9ff',
          letterSpacing: '0.02em',
        }}>
          {movie.language_name}
        </div>

        {/* Top-Right Heart Button (44px tap target) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(movie);
          }}
          aria-label={fav ? 'Remove from My List' : 'Add to My List'}
          aria-pressed={fav}
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: fav ? '#ff4b72' : '#ffffff',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: fav ? 'rgba(255, 75, 114, 0.25)' : 'rgba(10, 10, 15, 0.65)',
            backdropFilter: 'blur(6px)',
            border: fav ? '1px solid rgba(255, 75, 114, 0.6)' : '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.18s ease',
          }}>
            <Heart
              size={16}
              fill={fav ? '#ff4b72' : 'transparent'}
              color={fav ? '#ff4b72' : '#ffffff'}
            />
          </div>
        </button>

        {/* Smaller Match Ring SVG Badge */}
        {typeof matchPercent === 'number' && (
          <div className="match-ring-badge" title={`${matchPercent}% Match`}>
            <svg width="34" height="34" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background Track */}
              <circle
                cx="17"
                cy="17"
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="2.8"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="17"
                cy="17"
                r={radius}
                fill="transparent"
                stroke="url(#matchGradient)"
                strokeWidth="2.8"
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
              fontSize: '0.58rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em'
            }}>
              {matchPercent}%
            </span>
          </div>
        )}

        {/* Desktop Hover overlay gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to top, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.5) 45%, transparent 100%)',
            opacity: 0,
            transition: 'opacity 0.22s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '12px',
            zIndex: 6,
          }}
          className="card-hover-overlay"
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
        >
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
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
                gap: '3px',
                background: 'rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Eye size={12} />
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
                gap: '3px',
                background: 'var(--accent-violet)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={12} color="var(--accent-gold)" />
              Match
            </button>
          </div>

          <div style={{
            fontSize: '0.74rem',
            color: '#e5e7eb',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {movie.overview}
          </div>
        </div>
      </div>

      {/* Card Info Below Poster: Permanently visible on touch/mobile without hover */}
      <div style={{ padding: '8px 6px 4px 6px' }}>
        {movie.because_title && (
          <div style={{
            fontSize: '0.68rem',
            color: 'var(--accent-gold)',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}>
            <Sparkles size={11} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Because: {movie.because_title}
            </span>
          </div>
        )}
        <h3 style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#ffffff',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
          height: '2.6em',
          marginBottom: '4px'
        }}>
          {movie.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
          <span>{movie.year || '—'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--accent-gold)', fontWeight: 600, flexShrink: 0 }}>
            <Star size={11} fill="var(--accent-gold)" color="var(--accent-gold)" />
            <span>{movie.tmdb_rating ? movie.tmdb_rating.toFixed(1) : 'NR'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
