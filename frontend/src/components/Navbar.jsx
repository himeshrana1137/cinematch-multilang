import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, X, Clapperboard } from 'lucide-react';

export default function Navbar({ onSelectMovie, activeQueryValue }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

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

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      inputRef.current?.blur();
    }
  };

  const handlePick = (movie) => {
    onSelectMovie(movie);
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  return (
    <nav className="glass-nav" style={{ padding: '14px clamp(16px, 3vw, 28px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
      {/* Brand Logo */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
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
          boxShadow: '0 4px 14px rgba(124, 92, 255, 0.4)'
        }}>
          <Clapperboard size={20} color="#ffffff" />
        </div>
        <div>
          <span className="cinematic-serif" style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 40%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CineMatch
          </span>
          <span className="nav-subtitle" style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '-2px' }}>
            Multi-Language Discovery
          </span>
        </div>
      </div>

      {/* Pill Search with Autocomplete */}
      <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '440px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.07)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-pill)',
          padding: '8px 16px',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 2px var(--accent-violet)' : 'none'
        }}>
          <Search size={18} color="var(--text-secondary)" style={{ marginRight: '10px', flexShrink: 0 }} />
          <input
            ref={inputRef}
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
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'rgba(18, 18, 26, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px var(--accent-violet-glow)',
            zIndex: 100,
            maxHeight: '420px',
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
              results.map((movie, idx) => (
                <div
                  key={movie.id}
                  onClick={() => handlePick(movie)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    background: idx === selectedIndex ? 'rgba(124, 92, 255, 0.2)' : 'transparent',
                    borderBottom: idx < results.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      style={{ width: '36px', height: '54px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: '36px', height: '54px', background: '#252538', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Film size={16} color="var(--text-secondary)" />
                    </div>
                  )}
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {movie.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {movie.year && <span>{movie.year}</span>}
                      <span>•</span>
                      <span style={{ color: 'var(--accent-gold)' }}>★ {movie.tmdb_rating?.toFixed(1)}</span>
                      <span>•</span>
                      <span style={{
                        background: 'rgba(124, 92, 255, 0.25)',
                        color: '#c4b5fd',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem'
                      }}>
                        {movie.language_name}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
