import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Star, Clock, Calendar, Globe2, ExternalLink, User, Tv, Globe, Maximize, Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import ShareButton from './ShareButton';

const LANG_NAME_MAP = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
};

export default function DetailModal({ movie, onClose, autoPlayTrailer = false, activeChipId = 'all', onToast }) {
  const [showTrailer, setShowTrailer] = useState(autoPlayTrailer);
  const [details, setDetails] = useState(movie);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [hasUserSwapped, setHasUserSwapped] = useState(false);
  const [isPlayerSticky, setIsPlayerSticky] = useState(true);

  const tabsContainerRef = useRef(null);
  const modalScrollRef = useRef(null);
  const playerSectionRef = useRef(null);
  const detailsRef = useRef(null);
  const iframeRef = useRef(null);

  // Lock body scroll while modal is open
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

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

  // Handle sticky player release on phone scroll:
  // Stays visible while user interacts with chips, releases when scrolling down to cast/overview
  useEffect(() => {
    const scrollEl = modalScrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      if (window.innerWidth >= 640) {
        setIsPlayerSticky(false);
        return;
      }
      const detailsEl = detailsRef.current;
      if (!detailsEl) return;
      const detailsRect = detailsEl.getBoundingClientRect();
      if (detailsRect.top < 310) {
        setIsPlayerSticky(false);
      } else {
        setIsPlayerSticky(true);
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  const currentMovie = details || movie;
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = currentMovie ? isFavorite(currentMovie.id) : false;
  const trailers = currentMovie?.trailers || [];
  const movieOrigLang = currentMovie?.language || 'en';

  // Compute shown chips based strictly on activeChipId and trailers
  const trailerChips = React.useMemo(() => {
    const embeddedMap = {};
    for (const t of trailers) {
      if (t?.lang) embeddedMap[t.lang] = t;
    }

    const shownCodes = [];
    const addLang = (code) => {
      if (code && !shownCodes.includes(code)) {
        shownCodes.push(code);
      }
    };

    // Base: Original language is always first (tagged ORIGINAL)
    addLang(movieOrigLang);

    // RULE 1: active chip is "all" or "en" (Hollywood)
    if (activeChipId === 'all' || activeChipId === 'en') {
      addLang('en');
      addLang('hi');
      addLang('ta');
      addLang('te');
      // plus ml, kn, gu ONLY when TMDB has an embedded trailer
      for (const opt of ['ml', 'kn', 'gu']) {
        if (embeddedMap[opt]) {
          addLang(opt);
        }
      }
    }
    // RULE 2: South chips ("south_indian", "ta", "te", "ml", "kn")
    else if (['south_indian', 'south', 'ta', 'te', 'ml', 'kn'].includes(activeChipId)) {
      addLang('hi'); // Hindi is always present
      if (activeChipId === 'south_indian' || activeChipId === 'south') {
        for (const sc of ['ta', 'te', 'ml', 'kn']) {
          addLang(sc);
        }
      } else {
        addLang(activeChipId);
      }
    }
    // RULE 3: Gujarati chip ("gu")
    else if (activeChipId === 'gu') {
      addLang('gu');
    }

    return shownCodes.map((code) => {
      const isOrig = (code === movieOrigLang);
      const isEmbedded = Boolean(embeddedMap[code]);
      const tObj = embeddedMap[code];
      return {
        code,
        name: LANG_NAME_MAP[code] || code,
        is_original: isOrig,
        is_embedded: isEmbedded,
        key: tObj?.key || null,
        nameDetail: tObj?.name || null
      };
    });
  }, [movieOrigLang, trailers, activeChipId]);

  // Auto-select initial embedded language whenever movie or activeChip changes
  useEffect(() => {
    if (!currentMovie) return;
    const embedded = trailerChips.filter((c) => c.is_embedded);

    let savedLang = null;
    try {
      savedLang = localStorage.getItem('cinematch_last_trailer_lang');
    } catch (e) {}

    let chosen = null;
    if (savedLang && embedded.some((c) => c.code === savedLang)) {
      chosen = savedLang;
    } else if (embedded.some((c) => c.is_original)) {
      chosen = movieOrigLang;
    } else if (embedded.some((c) => c.code === 'en')) {
      chosen = 'en';
    } else if (embedded.some((c) => c.code === 'hi')) {
      chosen = 'hi';
    } else if (embedded.length > 0) {
      chosen = embedded[0].code;
    }

    setActiveLang(chosen);
  }, [currentMovie?.id, trailerChips, movieOrigLang]);

  if (!movie) return null;

  // Resolve real trailer language name (never "Hollywood", always "English", "Telugu", etc.)
  const origTrailerObj = trailers.find((t) => t.is_original);
  const origLangName =
    origTrailerObj?.lang_name ||
    LANG_NAME_MAP[currentMovie.language] ||
    (currentMovie.language_name === 'Hollywood' ? 'English' : currentMovie.language_name) ||
    'English';

  // Determine active trailer object & key
  const activeChipObj = trailerChips.find((c) => c.code === activeLang && c.is_embedded) || trailerChips.find((c) => c.is_embedded) || null;
  const activeTrailer = activeChipObj;
  const activeKey = activeChipObj?.key || currentMovie.default_trailer_key || currentMovie.trailer_key;

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
    try {
      localStorage.setItem('cinematch_last_trailer_lang', langCode);
    } catch (e) {}
    setTimeout(() => {
      setActiveLang(langCode);
      setIsSwapping(false);
    }, 180);
  };

  const handleLinkOnlyChip = (chip) => {
    const query = `${currentMovie.title || ''} ${currentMovie.year || ''} official trailer ${chip.name}`.trim();
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Keyboard navigation for tablist
  const handleKeyDownTabs = (e, index) => {
    if (trailerChips.length === 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (index + 1) % trailerChips.length;
      const nextChip = trailerChips[nextIdx];
      if (nextChip.is_embedded) {
        handleSelectLanguage(nextChip.code);
      }
      const buttons = tabsContainerRef.current?.querySelectorAll('button[role="tab"]');
      buttons?.[nextIdx]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (index - 1 + trailerChips.length) % trailerChips.length;
      const prevChip = trailerChips[prevIdx];
      if (prevChip.is_embedded) {
        handleSelectLanguage(prevChip.code);
      }
      const buttons = tabsContainerRef.current?.querySelectorAll('button[role="tab"]');
      buttons?.[prevIdx]?.focus();
    }
  };

  // Request Fullscreen
  const handleFullscreen = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (iframe.requestFullscreen) {
      iframe.requestFullscreen();
    } else if (iframe.webkitRequestFullscreen) {
      iframe.webkitRequestFullscreen();
    } else if (iframe.mozRequestFullScreen) {
      iframe.mozRequestFullScreen();
    } else if (iframe.msRequestFullscreen) {
      iframe.msRequestFullscreen();
    }
  };

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div
        ref={modalScrollRef}
        className="detail-modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Bar: Title on left, never overlaps 44px close button on right */}
        <div className="detail-modal-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(124, 92, 255, 0.2)',
              border: '1px solid rgba(124, 92, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Tv size={16} color="var(--accent-violet)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'nowrap' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>
                Official Trailer
              </span>
              {/* Single original-language indicator */}
              <span
                className="orig-lang-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  color: '#4ade80',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {origLangName} (Original Language)
              </span>
            </div>
          </div>

          {/* Top Bar Right: Share button, My List Heart button & 44px Close button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <ShareButton
              movie={currentMovie}
              onToast={onToast}
              style={{
                borderRadius: '50%',
              }}
            />

            <button
              type="button"
              onClick={() => toggleFavorite(currentMovie)}
              aria-label={fav ? 'Remove from My List' : 'Add to My List'}
              aria-pressed={fav}
              title={fav ? 'In My List' : 'Add to My List'}
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '50%',
                background: fav ? 'rgba(255, 75, 114, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: fav ? '1px solid rgba(255, 75, 114, 0.55)' : '1px solid rgba(255, 255, 255, 0.15)',
                color: fav ? '#ff4b72' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              <Heart size={18} fill={fav ? '#ff4b72' : 'transparent'} color={fav ? '#ff4b72' : '#ffffff'} />
            </button>

            {/* 44px Close Button */}
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-violet)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 16:9 YouTube Player (EDGE TO EDGE on mobile portrait) */}
        <div
          ref={playerSectionRef}
          className="modal-player-section"
          style={isPlayerSticky && typeof window !== 'undefined' && window.innerWidth < 640 ? {
            position: 'sticky',
            top: '56px',
            zIndex: 40,
          } : {
            position: 'relative',
          }}
        >
          <div className="modal-player-box">
            {showTrailer && activeKey ? (
              <iframe
                ref={iframeRef}
                key={activeKey}
                src={`https://www.youtube-nocookie.com/embed/${activeKey}?autoplay=${hasUserSwapped || autoPlayTrailer ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&fs=1`}
                title={`${currentMovie.title} Trailer (${activeTrailer?.name || activeTrailer?.lang_name || 'Official'})`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
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
                      style={{ padding: '12px 24px', fontSize: '0.95rem', minHeight: '44px' }}
                    >
                      <Play size={20} fill="#ffffff" color="#ffffff" />
                      Play {activeTrailer?.name || activeTrailer?.lang_name || origLangName} Trailer
                    </button>
                  ) : (
                    <div style={{
                      background: 'rgba(10, 10, 15, 0.9)',
                      padding: '18px 24px',
                      borderRadius: '16px',
                      textAlign: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      maxWidth: '380px'
                    }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.88rem' }}>
                        Trailer not available on TMDB
                      </p>
                      <a
                        href={youtubeSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                        style={{ textDecoration: 'none', display: 'inline-flex', padding: '8px 18px', fontSize: '0.82rem', minHeight: '40px' }}
                      >
                        Search on YouTube <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Player Toolbar: Fullscreen button + Open on YouTube link */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(10, 10, 15, 0.6)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {activeKey ? (
            <button
              onClick={handleFullscreen}
              aria-label="Play video fullscreen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <Maximize size={15} color="var(--accent-violet)" />
              <span>Fullscreen</span>
            </button>
          ) : <div />}

          {openOnYoutubeUrl && (
            <a
              href={openOnYoutubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                textDecoration: 'none',
                minHeight: '44px',
                padding: '6px 4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <span>Open on YouTube in new tab</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Rounded Bar: Available Trailer Languages Chips */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(10, 10, 15, 0.75)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <Globe size={16} color="var(--accent-violet)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2d9ff' }}>
              Available Trailer Languages:
            </span>
          </div>

          {trailerChips.length > 0 ? (
            <div
              ref={tabsContainerRef}
              role="tablist"
              aria-label="Trailer languages"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                padding: '4px 0 6px 0',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              {trailerChips.map((chip, idx) => {
                const isActive = chip.is_embedded && (chip.code === activeLang);

                if (chip.is_embedded) {
                  return (
                    <button
                      key={chip.code}
                      role="tab"
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => handleSelectLanguage(chip.code)}
                      onKeyDown={(e) => handleKeyDownTabs(e, idx)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 16px',
                        minHeight: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.84rem',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        border: isActive
                          ? '1px solid var(--accent-violet)'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        background: isActive ? '#7c5cff' : 'rgba(255, 255, 255, 0.06)',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: isActive ? '0 0 14px var(--accent-violet-glow)' : 'none',
                        flexShrink: 0,
                        transition: 'all 0.18s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      }}
                    >
                      <span>{chip.name}</span>
                      {chip.is_original && (
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
                }

                // Link-only chip (without TMDB trailer)
                return (
                  <button
                    key={chip.code}
                    role="tab"
                    aria-selected={false}
                    aria-label="No embedded trailer on TMDB. Search on YouTube"
                    onClick={() => handleLinkOnlyChip(chip)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '0 14px',
                      minHeight: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.84rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: '1px dashed rgba(255, 255, 255, 0.24)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      color: 'rgba(255, 255, 255, 0.65)',
                      flexShrink: 0,
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.45)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.24)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
                    }}
                  >
                    <span>{chip.name}</span>
                    {chip.is_original && (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#4ade80',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        ORIGINAL
                      </span>
                    )}
                    <ExternalLink size={13} style={{ marginLeft: '2px', opacity: 0.7 }} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              None found in TMDB
            </div>
          )}

          {/* Caption when at least one link-only chip is shown */}
          {trailerChips.some((c) => !c.is_embedded) && (
            <div style={{
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              marginTop: '8px',
              lineHeight: 1.35
            }}>
              Chips with a link icon open a YouTube search because TMDB has no embedded trailer in that language.
            </div>
          )}
        </div>

        {/* Movie Details (Title, Meta, Genres, Overview, Cast) */}
        <div ref={detailsRef} style={{ padding: '20px clamp(16px, 3vw, 32px) 32px clamp(16px, 3vw, 32px)' }}>
          {/* Title and Tagline */}
          <div style={{ marginBottom: '14px' }}>
            <h2 className="cinematic-serif" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '6px' }}>
              {currentMovie.title}
            </h2>
            {currentMovie.original_title && currentMovie.original_title !== currentMovie.title && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', fontStyle: 'italic', marginBottom: '4px' }}>
                Original: {currentMovie.original_title}
              </p>
            )}
            {currentMovie.tagline && (
              <p style={{ color: 'var(--accent-gold)', fontSize: '0.92rem', fontStyle: 'italic' }}>
                &ldquo;{currentMovie.tagline}&rdquo;
              </p>
            )}
          </div>

          {/* Quick Badges Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span style={{
              background: 'rgba(124, 92, 255, 0.2)',
              border: '1px solid var(--accent-violet)',
              color: '#c4b5fd',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.76rem',
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
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.76rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Star size={12} fill="var(--accent-gold)" color="var(--accent-gold)" />
                {currentMovie.tmdb_rating.toFixed(1)} ({currentMovie.vote_count || 0} votes)
              </span>
            )}

            {currentMovie.year && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <Calendar size={13} />
                {currentMovie.year}
              </span>
            )}

            {currentMovie.runtime > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <Clock size={13} />
                {Math.floor(currentMovie.runtime / 60)}h {currentMovie.runtime % 60}m
              </span>
            )}

            {currentMovie.director && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Director: <strong style={{ color: '#ffffff' }}>{currentMovie.director}</strong>
              </span>
            )}
          </div>

          {/* Genres */}
          {currentMovie.genres && currentMovie.genres.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
              {currentMovie.genres.map((g) => (
                <span
                  key={g}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
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
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Overview
            </h4>
            <p style={{ color: '#d1d5db', fontSize: '0.92rem', lineHeight: 1.6 }}>
              {currentMovie.overview || 'No synopsis available for this title.'}
            </p>
          </div>

          {/* Top Cast */}
          {currentMovie.cast && currentMovie.cast.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Top Cast
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                gap: '12px',
              }}>
                {currentMovie.cast.map((actor, idx) => (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      margin: '0 auto 6px auto',
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
                        <User size={24} color="var(--text-secondary)" />
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {actor.name}
                    </div>
                    {actor.character && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {currentMovie.keywords.map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.7rem',
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
