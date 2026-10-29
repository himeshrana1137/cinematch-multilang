import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Star, Globe2, Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

export default function Hero({ movie, onOpenTrailer, onScrollToRecommendations }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = movie ? isFavorite(movie.id) : false;

  const [currentBackdrop, setCurrentBackdrop] = useState(movie?.backdrop_url || movie?.poster_url);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (movie) {
      const nextBg = movie.backdrop_url || movie.poster_url;
      if (nextBg !== currentBackdrop) {
        setFading(true);
        const timer = setTimeout(() => {
          setCurrentBackdrop(nextBg);
          setFading(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [movie]);

  if (!movie) return null;

  return (
    <div className="hero-container">
      {/* Background with crossfade */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: currentBackdrop ? `url(${currentBackdrop})` : 'none',
        backgroundColor: '#12121a',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        filter: 'brightness(0.68) saturate(1.15)',
        transition: 'opacity 0.35s ease-in-out',
        opacity: fading ? 0.3 : 1,
      }} />

      {/* Cinematic dark gradients: stronger bottom gradient for mobile readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(to top, #0a0a0f 4%, rgba(10, 10, 15, 0.95) 45%, rgba(10, 10, 15, 0.6) 75%, rgba(10, 10, 15, 0.25) 100%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '65%',
        bottom: 0,
        background: 'linear-gradient(to right, rgba(10, 10, 15, 0.96) 0%, rgba(10, 10, 15, 0.7) 60%, transparent 100%)',
        pointerEvents: 'none'
      }} />

      {/* Content Container */}
      <div className="hero-content">
        {/* Compact Meta row: fits on one line at 360px */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'nowrap',
          whiteSpace: 'nowrap',
          marginBottom: '10px',
        }}>
          {/* Language badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.35) 0%, rgba(124, 92, 255, 0.2) 100%)',
            border: '1px solid var(--accent-violet)',
            color: '#e2d9ff',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.02em'
          }}>
            <Globe2 size={12} color="var(--accent-gold)" />
            {movie.language_name}
          </span>

          {/* Star Rating */}
          {movie.tmdb_rating > 0 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              background: 'rgba(245, 185, 66, 0.15)',
              border: '1px solid rgba(245, 185, 66, 0.4)',
              color: 'var(--accent-gold)',
              padding: '2px 7px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: 700
            }}>
              <Star size={11} fill="var(--accent-gold)" color="var(--accent-gold)" />
              {movie.tmdb_rating.toFixed(1)}
            </span>
          )}

          {/* Year */}
          {movie.year && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px', fontWeight: 500, padding: '0 2px' }}>
              {movie.year}
            </span>
          )}

          {/* Runtime */}
          {movie.runtime > 0 && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500 }}>
              • {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
            </span>
          )}
        </div>

        {/* Title: clamp(26px, 8vw, 34px) on mobile, max 2 lines */}
        <h1 className="cinematic-serif" style={{
          fontSize: 'clamp(26px, 6vw, 40px)',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          marginBottom: '8px',
          textShadow: '0 4px 16px rgba(0, 0, 0, 0.85)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}>
          {movie.title}
        </h1>

        {/* Tagline: 14px */}
        {movie.tagline && (
          <p style={{
            fontSize: '14px',
            fontStyle: 'italic',
            color: 'var(--accent-gold)',
            marginBottom: '10px',
            opacity: 0.92,
            fontWeight: 400,
            lineHeight: 1.35,
          }}>
            &ldquo;{movie.tagline}&rdquo;
          </p>
        )}

        {/* Overview: clamped to 3 lines */}
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.88rem',
          lineHeight: 1.45,
          marginBottom: '14px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)'
        }}>
          {movie.overview}
        </p>

        {/* Genre chips: in one horizontally scrollable row (no wrapping) */}
        {movie.genres && movie.genres.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            gap: '6px',
            marginBottom: '18px',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            paddingBottom: '2px',
          }}>
            {movie.genres.map((g) => (
              <span
                key={g}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(6px)',
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.72rem',
                  color: '#d1d5db',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons: Watch Trailer, More Like This & My List toggle (all 44px+ touch targets) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '430px' }}>
          <button
            onClick={() => onOpenTrailer(movie)}
            className="btn-primary"
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '10px 12px',
              fontSize: '0.86rem',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <Play size={16} fill="#ffffff" color="#ffffff" />
            Watch Trailer
          </button>

          <button
            onClick={onScrollToRecommendations}
            className="btn-secondary"
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '10px 12px',
              fontSize: '0.86rem',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={16} color="var(--accent-gold)" />
            More Like This
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(movie)}
            className="btn-secondary"
            aria-label={fav ? 'Remove from My List' : 'Add to My List'}
            aria-pressed={fav}
            title={fav ? 'In My List' : 'Add to My List'}
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-pill)',
              color: fav ? '#ff4b72' : '#ffffff',
              borderColor: fav ? 'rgba(255, 75, 114, 0.6)' : undefined,
              background: fav ? 'rgba(255, 75, 114, 0.2)' : undefined,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Heart size={18} fill={fav ? '#ff4b72' : 'transparent'} color={fav ? '#ff4b72' : '#ffffff'} />
          </button>
        </div>
      </div>
    </div>
  );
}
