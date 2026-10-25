import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Star, Clock, Globe2 } from 'lucide-react';

export default function Hero({ movie, onOpenTrailer, onScrollToRecommendations }) {
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
    <div style={{
      position: 'relative',
      minHeight: '520px',
      maxHeight: '680px',
      height: '65vh',
      width: '100%',
      borderRadius: '24px',
      overflow: 'hidden',
      marginBottom: '40px',
      display: 'flex',
      alignItems: 'flex-end',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
    }}>
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
        filter: 'brightness(0.72) saturate(1.15)',
        transition: 'opacity 0.4s ease-in-out',
        opacity: fading ? 0.3 : 1,
      }} />

      {/* Cinematic dark gradients */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(to top, #0a0a0f 8%, rgba(10, 10, 15, 0.8) 45%, rgba(10, 10, 15, 0.25) 100%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '60%',
        bottom: 0,
        background: 'linear-gradient(to right, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.6) 50%, transparent 100%)',
        pointerEvents: 'none'
      }} />

      {/* Content Container */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '28px clamp(18px, 4vw, 44px)',
        maxWidth: '820px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Badges row */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.35) 0%, rgba(124, 92, 255, 0.2) 100%)',
            border: '1px solid var(--accent-violet)',
            color: '#e2d9ff',
            padding: '4px 12px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '0.04em'
          }}>
            <Globe2 size={13} color="var(--accent-gold)" />
            {movie.language_name}
          </span>

          {movie.tmdb_rating > 0 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(245, 185, 66, 0.15)',
              border: '1px solid rgba(245, 185, 66, 0.4)',
              color: 'var(--accent-gold)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              <Star size={13} fill="var(--accent-gold)" color="var(--accent-gold)" />
              {movie.tmdb_rating.toFixed(1)}
            </span>
          )}

          {movie.year && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
              {movie.year}
            </span>
          )}

          {movie.runtime && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              <Clock size={13} />
              {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="cinematic-serif" style={{
          fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
          fontWeight: 900,
          lineHeight: 1.12,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          marginBottom: '10px',
          textShadow: '0 4px 16px rgba(0, 0, 0, 0.8)'
        }}>
          {movie.title}
        </h1>

        {/* Tagline */}
        {movie.tagline && (
          <p style={{
            fontSize: '1.05rem',
            fontStyle: 'italic',
            color: 'var(--accent-gold)',
            marginBottom: '14px',
            opacity: 0.9,
            fontWeight: 400
          }}>
            &ldquo;{movie.tagline}&rdquo;
          </p>
        )}

        {/* Overview */}
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.94rem',
          lineHeight: 1.6,
          marginBottom: '18px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)'
        }}>
          {movie.overview}
        </p>

        {/* Genre pills */}
        {movie.genres && movie.genres.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
            {movie.genres.map((g) => (
              <span
                key={g}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(6px)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.76rem',
                  color: '#d1d5db',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onOpenTrailer(movie)}
            className="btn-primary"
          >
            <Play size={18} fill="#ffffff" color="#ffffff" />
            Watch Trailer
          </button>

          <button
            onClick={onScrollToRecommendations}
            className="btn-secondary"
          >
            <Sparkles size={18} color="var(--accent-gold)" />
            More Like This
          </button>
        </div>
      </div>
    </div>
  );
}
