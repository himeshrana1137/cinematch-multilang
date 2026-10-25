import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Star, Clock, Calendar, Globe2, ExternalLink, User, Tv, Globe } from 'lucide-react';

export default function DetailModal({ movie, onClose, autoPlayTrailer = false }) {
  const [showTrailer, setShowTrailer] = useState(autoPlayTrailer);
  const [details, setDetails] = useState(movie);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [hasUserSwapped, setHasUserSwapped] = useState(false);

  const tabsContainerRef = useRef(null);

  // Sync autoPlayTrailer if changed
  useEffect(() => {
    setShowTrailer(autoPlayTrailer);
  }, [autoPlayTrailer]);

  // Fetch full details (/api/movie/<id>) to get multi-language trailers
  useEffect(() => {
    if (!movie?.id) return;
    let isMounted = true;
    setLoading(true);

    fetch(`/api/movie/${movie.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setDetails((prev) => ({ ...prev, ...data }));
          // Set initial active language to first trailer (original language is first)
          if (data.trailers && data.trailers.length > 0) {
            setActiveLang(data.trailers[0].lang);
          }
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
  const trailers = currentMovie.trailers || [];
  const origLangName = currentMovie.original_language_name || currentMovie.language_name || 'Original';

  // Determine active trailer object
  const activeTrailer = trailers.find((t) => t.lang === activeLang) || trailers[0] || null;
  const activeKey = activeTrailer?.key || currentMovie.default_trailer_key || currentMovie.trailer_key;

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    (currentMovie.title || '') + ' ' + (currentMovie.year || '') + ' trailer'
  )}`;
  const openOnYoutubeUrl = activeKey ? `https://www.youtube.com/watch?v=${activeKey}` : null;

  // Handle language chip switch
  const handleSelectLanguage = (langCode) => {
    if (langCode === activeLang) return;
    setIsSwapping(true);
    setHasUserSwapped(true);
    setShowTrailer(true);
    setTimeout(() => {
      setActiveLang(langCode);
      setIsSwapping(false);
    }, 180);
  };

  // Keyboard navigation for tablist
  const handleKeyDownTabs = (e, index) => {
    if (trailers.length === 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (index + 1) % trailers.length;
      handleSelectLanguage(trailers[nextIdx].lang);
      const buttons = tabsContainerRef.current?.querySelectorAll('button[role="tab"]');
      buttons?.[nextIdx]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (index - 1 + trailers.length) % trailers.length;
      handleSelectLanguage(trailers[prevIdx].lang);
      const buttons = tabsContainerRef.current?.querySelectorAll('button[role="tab"]');
      buttons?.[prevIdx]?.focus();
    }
  };

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
          maxWidth: '880px',
          maxHeight: '92vh',
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
            zIndex: 30,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-violet)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 10, 15, 0.8)'; }}
        >
          <X size={20} />
        </button>

        {/* Video & Trailer Header Section */}
        <div style={{ padding: '24px 28px 0 28px', background: 'linear-gradient(to bottom, #181824 0%, #12121a 100%)' }}>
          {/* Header Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(124, 92, 255, 0.18)',
                border: '1px solid rgba(124, 92, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Tv size={20} color="var(--accent-violet)" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                    Official Trailer
                  </h3>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    color: '#4ade80',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}>
                    {origLangName} (Original Language)
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {currentMovie.title} — Verified TMDB YouTube Player
                </p>
              </div>
            </div>

            {/* Original Language status indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
              }} />
              <span>Original Language: <strong style={{ color: '#ffffff' }}>{origLangName}</strong></span>
            </div>
          </div>

          {/* Rounded Dark Bar: Available Trailer Languages Chips */}
          <div style={{
            background: 'rgba(10, 10, 15, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <Globe size={16} color="var(--accent-violet)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2d9ff' }}>
                Available Trailer Languages:
              </span>
            </div>

            {trailers.length > 0 ? (
              <div
                ref={tabsContainerRef}
                role="tablist"
                aria-label="Trailer languages"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
              >
                {trailers.map((t, idx) => {
                  const isActive = (t.lang === activeLang) || (!activeLang && idx === 0);
                  return (
                    <button
                      key={t.lang}
                      role="tab"
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => handleSelectLanguage(t.lang)}
                      onKeyDown={(e) => handleKeyDownTabs(e, idx)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.82rem',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        border: isActive
                          ? '1px solid var(--accent-violet)'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isActive ? '#7c5cff' : 'rgba(255, 255, 255, 0.06)',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: isActive ? '0 0 12px var(--accent-violet-glow)' : 'none',
                        transition: 'all 0.18s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      }}
                    >
                      <span>{t.lang_name}</span>
                      {t.is_original && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          background: isActive ? 'rgba(0, 0, 0, 0.35)' : 'rgba(34, 197, 94, 0.25)',
                          color: isActive ? '#ffffff' : '#4ade80',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          ORIGINAL
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                None found in TMDB
              </span>
            )}
          </div>

          {/* Single language note if applicable */}
          {trailers.length === 1 && (
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', paddingLeft: '4px' }}>
              Only the original-language trailer is available on TMDB.
            </div>
          )}

          {/* 16:9 YouTube Player or Backdrop Screen */}
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            background: '#0a0a0f',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)'
          }}>
            {showTrailer && activeKey ? (
              <iframe
                key={activeKey}
                src={`https://www.youtube-nocookie.com/embed/${activeKey}?autoplay=${hasUserSwapped || autoPlayTrailer ? 1 : 0}&rel=0&modestbranding=1`}
                title={`${currentMovie.title} Trailer (${activeTrailer?.lang_name || 'Official'})`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  opacity: isSwapping ? 0 : 1,
                  transition: 'opacity 0.2s ease-in-out'
                }}
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
                  background: 'linear-gradient(to top, #12121a 0%, rgba(10, 10, 15, 0.5) 60%, transparent 100%)',
                }}>
                  {activeKey ? (
                    <button
                      onClick={() => {
                        setShowTrailer(true);
                        setHasUserSwapped(true);
                      }}
                      className="btn-primary"
                      style={{ padding: '14px 28px', fontSize: '1rem' }}
                    >
                      <Play size={22} fill="#ffffff" color="#ffffff" />
                      Play {activeTrailer?.lang_name || origLangName} Trailer
                    </button>
                  ) : (
                    <div style={{
                      background: 'rgba(10, 10, 15, 0.88)',
                      padding: '20px 28px',
                      borderRadius: '16px',
                      textAlign: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      maxWidth: '400px'
                    }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.92rem' }}>
                        Trailer not available on TMDB
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

          {/* Under-player Links: Open on YouTube */}
          {activeKey && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', marginBottom: '8px' }}>
              <a
                href={openOnYoutubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <span>Open on YouTube in new tab</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Modal Body & Movie Metadata */}
        <div style={{ padding: '24px 32px 32px 32px' }}>
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

          {/* Top Cast */}
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
