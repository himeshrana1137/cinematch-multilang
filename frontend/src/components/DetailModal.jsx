import React, { useState, useEffect } from 'react';
import { X, Play, Star, Clock, Calendar, Globe2, ExternalLink, User } from 'lucide-react';

export default function DetailModal({ movie, onClose, autoPlayTrailer = false }) {
  const [showTrailer, setShowTrailer] = useState(autoPlayTrailer);
  const [details, setDetails] = useState(movie);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setShowTrailer(autoPlayTrailer);
  }, [autoPlayTrailer, movie]);

  // Fetch full details if needed (/api/movie/<id>)
  useEffect(() => {
    if (!movie?.id) return;
    let isMounted = true;
    setLoading(true);

    fetch(`/api/movie/${movie.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setDetails((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => console.error('Error fetching movie details:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [movie?.id]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!movie) return null;

  const currentMovie = details || movie;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(currentMovie.title + ' ' + (currentMovie.year || '') + ' official trailer')}`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#12121a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px var(--accent-violet-glow)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(10, 10, 15, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-violet)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 10, 15, 0.8)'; }}
        >
          <X size={20} />
        </button>

        {/* Video or Backdrop Header */}
        <div style={{ position: 'relative', width: '100%', height: '360px', background: '#0a0a0f', overflow: 'hidden' }}>
          {showTrailer && currentMovie.trailer_key ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${currentMovie.trailer_key}?autoplay=1&rel=0&modestbranding=1`}
              title={`${currentMovie.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <>
              <div style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${currentMovie.backdrop_url || currentMovie.poster_url || ''})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.65)',
              }} />

              {/* Play Trailer overlay button */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(to top, #12121a 0%, transparent 60%)',
              }}>
                {currentMovie.trailer_key ? (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="btn-primary"
                    style={{ padding: '14px 28px', fontSize: '1rem' }}
                  >
                    <Play size={22} fill="#ffffff" color="#ffffff" />
                    Play Trailer
                  </button>
                ) : (
                  <div style={{
                    background: 'rgba(10, 10, 15, 0.85)',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '10px', fontSize: '0.9rem' }}>
                      Trailer not available in database
                    </p>
                    <a
                      href={youtubeSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ textDecoration: 'none', display: 'inline-flex', padding: '8px 18px', fontSize: '0.85rem' }}
                    >
                      Search on YouTube <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '32px' }}>
          {/* Title and Meta */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <h2 className="cinematic-serif" style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                {currentMovie.title}
              </h2>
              {currentMovie.original_title && currentMovie.original_title !== currentMovie.title && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontStyle: 'italic', marginBottom: '6px' }}>
                  Original: {currentMovie.original_title}
                </p>
              )}
              {currentMovie.tagline && (
                <p style={{ color: 'var(--accent-gold)', fontSize: '0.95rem', fontStyle: 'italic' }}>
                  &ldquo;{currentMovie.tagline}&rdquo;
                </p>
              )}
            </div>

            {/* Quick badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(124, 92, 255, 0.2)',
                border: '1px solid var(--accent-violet)',
                color: '#c4b5fd',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Globe2 size={12} />
                {currentMovie.language_name}
              </span>
              {currentMovie.tmdb_rating > 0 && (
                <span style={{
                  background: 'rgba(245, 185, 66, 0.15)',
                  border: '1px solid rgba(245, 185, 66, 0.3)',
                  color: 'var(--accent-gold)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Star size={13} fill="var(--accent-gold)" color="var(--accent-gold)" />
                  {currentMovie.tmdb_rating.toFixed(1)} ({currentMovie.vote_count || 0} votes)
                </span>
              )}
            </div>
          </div>

          {/* Meta specs row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            {currentMovie.year && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} />
                {currentMovie.year}
              </span>
            )}
            {currentMovie.runtime && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                {Math.floor(currentMovie.runtime / 60)}h {currentMovie.runtime % 60}m
              </span>
            )}
            {currentMovie.director && (
              <span>
                Director: <strong style={{ color: '#ffffff' }}>{currentMovie.director}</strong>
              </span>
            )}
          </div>

          {/* Genres */}
          {currentMovie.genres && currentMovie.genres.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {currentMovie.genres.map((g) => (
                <span
                  key={g}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.78rem',
                    color: '#d1d5db',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Overview text */}
          <div style={{ marginBottom: '28px' }}>
            <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Overview
            </h4>
            <p style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: 1.65 }}>
              {currentMovie.overview || 'No synopsis available for this title.'}
            </p>
          </div>

          {/* Cast Avatars */}
          {currentMovie.cast && currentMovie.cast.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Top Cast
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: '14px',
              }}>
                {currentMovie.cast.map((actor, idx) => (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      margin: '0 auto 8px auto',
                      background: '#1a1a26',
                      border: '2px solid rgba(124, 92, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {actor.profile_url ? (
                        <img
                          src={actor.profile_url}
                          alt={actor.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      ) : (
                        <User size={28} color="var(--text-secondary)" />
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {actor.name}
                    </div>
                    {actor.character && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {actor.character}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {currentMovie.keywords && currentMovie.keywords.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {currentMovie.keywords.map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
