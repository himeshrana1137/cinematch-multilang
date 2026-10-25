import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, X, Clapperboard } from 'lucide-react';

export default function Navbar({ onSelectMovie, activeQueryValue }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const desktopSearchRef = useRef(null);
  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const mobilePanelRef = useRef(null);

  // Debounced search (300 ms)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const langParam = activeQueryValue ? `&languages=${activeQueryValue}` : '';
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}${langParam}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, activeQueryValue]);

  // Support ?search=<query> deep link for verification or instant search
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      if (searchParam) {
        setQuery(searchParam);
        if (window.innerWidth < 640) {
          setIsMobileSearchOpen(true);
        } else {
          setIsOpen(true);
        }
      }
    } catch (e) {
      console.warn('Error reading search query param:', e);
    }
  }, []);

  // Lock body scroll when mobile search is open
  useEffect(() => {
    if (isMobileSearchOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Autofocus input
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 50);
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isMobileSearchOpen]);

  // Handle outside click for desktop
  useEffect(() => {
    function handleClickOutside(event) {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Esc key listener
  useEffect(() => {
    function handleGlobalEsc(e) {
      if (e.key === 'Escape') {
        if (isMobileSearchOpen) {
          setIsMobileSearchOpen(false);
          setQuery('');
        } else if (isOpen) {
          setIsOpen(false);
          desktopInputRef.current?.blur();
        }
      }
    }
    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, [isMobileSearchOpen, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handlePick(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsMobileSearchOpen(false);
      desktopInputRef.current?.blur();
    }
  };

  const handlePick = (movie) => {
    onSelectMovie(movie);
    setQuery('');
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    setResults([]);
  };

  // Helper to render movie result row (used in both desktop and mobile dropdowns)
  const renderResultRow = (movie, idx) => (
    <div
      key={movie.id}
      onClick={() => handlePick(movie)}
      onMouseEnter={() => setSelectedIndex(idx)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        minHeight: '56px',
        cursor: 'pointer',
        background: idx === selectedIndex ? 'rgba(124, 92, 255, 0.22)' : 'transparent',
        borderBottom: idx < results.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
        transition: 'background 0.15s ease',
      }}
    >
      {movie.poster_url ? (
        <img
          src={movie.poster_url}
          alt={movie.title}
          style={{ width: '44px', height: '66px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: '44px', height: '66px', background: '#252538', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Film size={18} color="var(--text-secondary)" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title wraps up to 2 lines cleanly */}
        <div style={{
          fontSize: '0.92rem',
          fontWeight: 600,
          color: '#ffffff',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}>
          {movie.title}
        </div>
        {/* Metadata row with non-clipped star rating */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          marginTop: '4px',
          flexWrap: 'nowrap',
        }}>
          {movie.year && <span>{movie.year}</span>}
          <span>•</span>
          <span style={{
            background: 'rgba(124, 92, 255, 0.25)',
            color: '#c4b5fd',
            padding: '1px 6px',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            {movie.language_name}
          </span>
          <span>•</span>
          <span style={{
            color: 'var(--accent-gold)',
            fontWeight: 700,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            ★ {movie.tmdb_rating ? movie.tmdb_rating.toFixed(1) : 'NR'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <nav className="glass-nav" style={{ padding: '12px clamp(16px, 3vw, 28px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        {/* Brand Logo */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', minHeight: '44px' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c5cff 0%, #f5b942 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(124, 92, 255, 0.4)',
            flexShrink: 0
          }}>
            <Clapperboard size={20} color="#ffffff" />
          </div>
          <div>
            <span className="cinematic-serif" style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.45rem)', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 40%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CineMatch
            </span>
            <span className="nav-subtitle" style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '-2px' }}>
              Multi-Language Discovery
            </span>
          </div>
        </div>

        {/* Desktop Search Pill (hidden on screens < 640px) */}
        <div ref={desktopSearchRef} className="desktop-search-wrap">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-pill)',
            padding: '8px 16px',
            width: '100%',
            transition: 'all 0.2s ease',
            boxShadow: isOpen ? '0 0 0 2px var(--accent-violet)' : 'none'
          }}>
            <Search size={18} color="var(--text-secondary)" style={{ marginRight: '10px', flexShrink: 0 }} />
            <input
              ref={desktopInputRef}
              type="text"
              placeholder="Search movies, titles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (results.length > 0) setIsOpen(true); }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '0.92rem',
                width: '100%',
                fontFamily: 'inherit'
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '4px' }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Desktop Autocomplete Dropdown (at least 420px wide) */}
          {isOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              minWidth: '420px',
              background: 'rgba(18, 18, 26, 0.98)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85), 0 0 20px var(--accent-violet-glow)',
              zIndex: 100,
              maxHeight: '440px',
              overflowY: 'auto'
            }}>
              {loading ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  No matching movies found.
                </div>
              ) : (
                results.map((movie, idx) => renderResultRow(movie, idx))
              )}
            </div>
          )}
        </div>

        {/* Mobile Search Icon Trigger (< 640px) */}
        <button
          className="mobile-search-trigger"
          onClick={() => setIsMobileSearchOpen(true)}
          aria-label="Open search"
        >
          <Search size={20} />
        </button>
      </nav>

      {/* Mobile Full-Width Search Panel (< 640px) */}
      {isMobileSearchOpen && (
        <>
          {/* Dimmed backdrop */}
          <div
            onClick={() => {
              setIsMobileSearchOpen(false);
              setQuery('');
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 89,
            }}
          />

          {/* Search Panel directly under navbar */}
          <div
            ref={mobilePanelRef}
            style={{
              position: 'fixed',
              top: '64px',
              left: '12px',
              right: '12px',
              zIndex: 90,
              maxHeight: '70dvh',
              background: 'rgba(18, 18, 26, 0.98)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.95), 0 0 25px var(--accent-violet-glow)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Input Header Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              gap: '10px',
            }}>
              <Search size={18} color="var(--accent-violet)" style={{ flexShrink: 0 }} />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search movies by title..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  setQuery('');
                  setResults([]);
                }}
                aria-label="Close search"
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Results list */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              maxHeight: 'calc(70dvh - 64px)',
            }}>
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Searching movies...
                </div>
              ) : query && results.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No matching movies found.
                </div>
              ) : !query ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Type a title to search across all languages
                </div>
              ) : (
                results.map((movie, idx) => renderResultRow(movie, idx))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
