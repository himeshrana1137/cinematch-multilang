import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, X, Clapperboard, SlidersHorizontal, ChevronDown, Check, Heart, Trash2 } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

export default function Navbar({
  onSelectMovieFromSearch,
  activeGenre,
  onSelectGenre,
  genresList = [],
  loadingGenres = false,
}) {
  const { favoriteCards, favoriteIds, removeFavorite, clearFavorites } = useFavorites();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Genres menu state
  const [isGenresOpen, setIsGenresOpen] = useState(false);
  const [isMobileGenresOpen, setIsMobileGenresOpen] = useState(false);
  const [selectedGenreIndex, setSelectedGenreIndex] = useState(-1);

  // My List menu state
  const [isMyListOpen, setIsMyListOpen] = useState(false);
  const [isMobileMyListOpen, setIsMobileMyListOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const desktopSearchRef = useRef(null);
  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const mobilePanelRef = useRef(null);

  const desktopGenresRef = useRef(null);
  const mobileGenresPanelRef = useRef(null);

  const desktopMyListRef = useRef(null);
  const mobileMyListPanelRef = useRef(null);

  // Global search debounced (300 ms) - ignores languages and genre
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=10`);
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
  }, [query]);

  // Support ?search=<query> deep link for verification or instant search
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      if (searchParam) {
        setQuery(searchParam);
        if (window.innerWidth < 900) {
          setIsMobileSearchOpen(true);
        } else {
          setIsOpen(true);
        }
      }
    } catch (e) {
      console.warn('Error reading search query param:', e);
    }
  }, []);

  // Auto-close mobile panels when resizing above 900px, or desktop menus below 900px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 900) {
        setIsMobileGenresOpen(false);
        setIsMobileSearchOpen(false);
        setIsMobileMyListOpen(false);
      } else {
        setIsGenresOpen(false);
        setIsOpen(false);
        setIsMyListOpen(false);
        setConfirmClear(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile search, mobile genres, or mobile my list is open
  useEffect(() => {
    if (isMobileSearchOpen || isMobileGenresOpen || isMobileMyListOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if (isMobileSearchOpen) {
        setTimeout(() => {
          mobileInputRef.current?.focus();
        }, 50);
      }
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isMobileSearchOpen, isMobileGenresOpen, isMobileMyListOpen]);

  // Handle outside click for desktop dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (desktopGenresRef.current && !desktopGenresRef.current.contains(event.target)) {
        setIsGenresOpen(false);
      }
      if (desktopMyListRef.current && !desktopMyListRef.current.contains(event.target)) {
        setIsMyListOpen(false);
        setConfirmClear(false);
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
        if (isMobileGenresOpen) {
          setIsMobileGenresOpen(false);
        }
        if (isGenresOpen) {
          setIsGenresOpen(false);
        }
        if (isMobileMyListOpen) {
          setIsMobileMyListOpen(false);
        }
        if (isMyListOpen) {
          setIsMyListOpen(false);
          setConfirmClear(false);
        }
      }
    }
    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, [isMobileSearchOpen, isOpen, isMobileGenresOpen, isGenresOpen, isMobileMyListOpen, isMyListOpen]);

  // Keyboard navigation for search
  const handleSearchKeyDown = (e) => {
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
    onSelectMovieFromSearch(movie);
    setQuery('');
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    setResults([]);
  };

  // Keyboard navigation for desktop genres menu
  const genreOptions = [{ name: null, label: 'All genres' }, ...genresList.map((g) => ({ name: g.name, label: g.name, count: g.count }))];

  const handleGenresKeyDown = (e) => {
    if (!isGenresOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedGenreIndex((prev) => (prev < genreOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedGenreIndex((prev) => (prev > 0 ? prev - 1 : genreOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedGenreIndex >= 0 && selectedGenreIndex < genreOptions.length) {
        onSelectGenre(genreOptions[selectedGenreIndex].name);
        setIsGenresOpen(false);
      }
    }
  };

  // Helper to render movie result row
  const renderResultRow = (movie, idx) => (
    <div
      key={movie.id}
      className="search-result-row"
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
            {movie.language_name || movie.language}
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
      <nav
        className="glass-nav"
        style={{
          minHeight: '64px',
          height: '64px',
          padding: '0 clamp(12px, 3vw, 24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* Left: Brand Logo + Subtitle (clean, no top developer line) */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flexShrink: 0 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c5cff 0%, #f5b942 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(124, 92, 255, 0.4)',
              flexShrink: 0
            }}>
              <Clapperboard size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span className="cinematic-serif nav-wordmark" style={{ fontSize: 'clamp(1.15rem, 3.2vw, 1.4rem)', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 40%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
                  CineMatch
                </span>
              </div>
              <span className="nav-subtitle" style={{ display: 'block', fontSize: '0.64rem', color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '-1px' }}>
                Multi-Language Discovery
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right Actions: Search + Genres + My List */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
          {/* Mobile Search Icon Trigger (< 900px, 44px) */}
          <button
            className="mobile-search-trigger"
            onClick={() => {
              setIsMobileSearchOpen(true);
              setIsMobileGenresOpen(false);
              setIsMobileMyListOpen(false);
            }}
            aria-label="Open search"
          >
            <Search size={20} />
          </button>

          {/* Desktop Search Pill (hidden on screens < 900px) */}
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
                onKeyDown={handleSearchKeyDown}
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

            {/* Desktop Autocomplete Dropdown */}
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
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.4 }}>
                    No match found. Check the spelling, the catalogue has about 3,900 popular movies.
                  </div>
                ) : (
                  results.map((movie, idx) => renderResultRow(movie, idx))
                )}
              </div>
            )}
          </div>

          {/* Genres Dropdown Button */}
          <div ref={desktopGenresRef} style={{ position: 'relative' }}>
            <button
              className={`nav-genres-btn ${activeGenre ? 'is-active' : ''}`}
              onClick={() => {
                if (window.innerWidth < 900) {
                  setIsMobileGenresOpen(!isMobileGenresOpen);
                  setIsMobileSearchOpen(false);
                  setIsMobileMyListOpen(false);
                } else {
                  setIsGenresOpen(!isGenresOpen);
                  setIsOpen(false);
                  setIsMyListOpen(false);
                  setSelectedGenreIndex(-1);
                }
              }}
              onKeyDown={handleGenresKeyDown}
              aria-label={activeGenre ? `Genres: ${activeGenre}, change` : 'Genres'}
              aria-haspopup="menu"
              aria-expanded={isGenresOpen || isMobileGenresOpen}
            >
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <SlidersHorizontal size={17} color={activeGenre ? 'var(--accent-gold)' : 'var(--accent-violet)'} />
                {/* Small violet dot badge when genre is active below 900px */}
                {activeGenre && (
                  <span
                    className="genres-btn-dot-badge"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-violet)',
                      boxShadow: '0 0 6px var(--accent-violet)',
                    }}
                  />
                )}
              </div>

              {/* Desktop text label, clear (x), and chevron (hidden below 900px via CSS) */}
              <span className="genres-btn-desktop-content">
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeGenre ? `Genres: ${activeGenre}` : 'Genres'}
                </span>
                {activeGenre && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectGenre(null);
                      setIsGenresOpen(false);
                      setIsMobileGenresOpen(false);
                    }}
                    aria-label="Clear genre filter"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.18)',
                      marginLeft: '2px',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={11} />
                  </span>
                )}
                <ChevronDown size={14} style={{ opacity: 0.7, transform: (isGenresOpen || isMobileGenresOpen) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: '2px' }} />
              </span>
            </button>

            {/* Desktop Genres Dropdown Menu */}
            {isGenresOpen && (
              <div
                role="menu"
                aria-label="Filter by genre"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: '220px',
                  background: 'rgba(18, 18, 26, 0.98)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.8), 0 0 20px var(--accent-violet-glow)',
                  zIndex: 110,
                  maxHeight: '380px',
                  overflowY: 'auto',
                }}
              >
                {/* Option 1: All genres */}
                <div
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => {
                    onSelectGenre(null);
                    setIsGenresOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    background: activeGenre === null ? 'rgba(124, 92, 255, 0.25)' : 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    color: activeGenre === null ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: activeGenre === null ? 600 : 400,
                    fontSize: '0.86rem',
                  }}
                >
                  <span>All genres</span>
                  {activeGenre === null && <Check size={14} color="var(--accent-violet)" />}
                </div>

                {/* Genres List */}
                {genresList.map((g, idx) => {
                  const isItemActive = activeGenre === g.name;
                  return (
                    <div
                      key={g.name}
                      role="menuitem"
                      tabIndex={0}
                      onClick={() => {
                        onSelectGenre(g.name);
                        setIsGenresOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        background: isItemActive
                          ? 'rgba(124, 92, 255, 0.25)'
                          : idx === selectedGenreIndex - 1
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'transparent',
                        borderBottom: idx < genresList.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                        color: isItemActive ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: isItemActive ? 600 : 400,
                        fontSize: '0.86rem',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isItemActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isItemActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>{g.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {g.count}
                        </span>
                        {isItemActive && <Check size={14} color="var(--accent-violet)" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My List Dropdown Button */}
          <div ref={desktopMyListRef} style={{ position: 'relative' }}>
            <button
              className={`nav-mylist-btn ${favoriteIds.length > 0 ? 'is-active' : ''}`}
              onClick={() => {
                if (window.innerWidth < 900) {
                  setIsMobileMyListOpen(!isMobileMyListOpen);
                  setIsMobileSearchOpen(false);
                  setIsMobileGenresOpen(false);
                } else {
                  setIsMyListOpen(!isMyListOpen);
                  setIsGenresOpen(false);
                  setIsOpen(false);
                  setConfirmClear(false);
                }
              }}
              aria-label={favoriteIds.length > 0 ? `My List: ${favoriteIds.length} items` : 'My List'}
              aria-haspopup="dialog"
              aria-expanded={isMyListOpen || isMobileMyListOpen}
            >
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart
                  size={17}
                  color={favoriteIds.length > 0 ? '#ff4b72' : 'var(--accent-violet)'}
                  fill={favoriteIds.length > 0 ? '#ff4b72' : 'transparent'}
                />
                {favoriteIds.length > 0 && (
                  <span
                    className="mylist-btn-badge"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-8px',
                      background: 'var(--accent-violet)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 6px var(--accent-violet)',
                      lineHeight: 1,
                    }}
                  >
                    {favoriteIds.length}
                  </span>
                )}
              </div>
              <span className="mylist-btn-desktop-content">
                <span>My List</span>
              </span>
            </button>

            {/* Desktop My List Dropdown */}
            {isMyListOpen && (
              <div
                role="dialog"
                aria-label="My List"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '360px',
                  maxHeight: '440px',
                  background: 'rgba(18, 18, 26, 0.98)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '16px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85), 0 0 20px var(--accent-violet-glow)',
                  zIndex: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Desktop My List Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Heart size={16} fill="#ff4b72" color="#ff4b72" />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>
                      My List ({favoriteCards.length})
                    </span>
                  </div>
                  {favoriteCards.length > 0 && (
                    confirmClear ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Clear?</span>
                        <button
                          type="button"
                          onClick={() => { clearFavorites(); setConfirmClear(false); }}
                          style={{
                            background: '#ff4b72',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClear(false)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClear(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Clear all
                      </button>
                    )
                  )}
                </div>

                {/* Items */}
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '360px' }}>
                  {favoriteCards.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                      <Heart size={36} color="var(--accent-violet)" style={{ opacity: 0.35, marginBottom: '10px' }} />
                      <p style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                        Your list is empty
                      </p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                        Heart any movie to add it to your watchlist.
                      </p>
                    </div>
                  ) : (
                    favoriteCards.map((movie) => (
                      <div
                        key={movie.id}
                        onClick={() => {
                          onSelectMovieFromSearch(movie);
                          setIsMyListOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          style={{ width: '38px', height: '56px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#ffffff', fontSize: '0.86rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {movie.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            <span>{movie.year || '—'}</span>
                            <span>&bull;</span>
                            <span>{movie.language_name}</span>
                            {movie.tmdb_rating > 0 && (
                              <>
                                <span>&bull;</span>
                                <span style={{ color: 'var(--accent-gold)' }}>★ {movie.tmdb_rating.toFixed(1)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavorite(movie.id);
                          }}
                          aria-label={`Remove ${movie.title} from My List`}
                          style={{
                            width: '44px',
                            height: '44px',
                            minWidth: '44px',
                            minHeight: '44px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4b72'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Full-Width Genres Panel (< 640px) */}
      {isMobileGenresOpen && (
        <>
          {/* Dimmed backdrop */}
          <div
            onClick={() => setIsMobileGenresOpen(false)}
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

          <div
            ref={mobileGenresPanelRef}
            role="menu"
            aria-label="Filter by genre"
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
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={17} color="var(--accent-violet)" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                  Filter by Genre
                </span>
              </div>
              <button
                onClick={() => setIsMobileGenresOpen(false)}
                aria-label="Close genres"
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

            {/* Genres List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              maxHeight: 'calc(70dvh - 64px)',
            }}>
              {/* Option 1: All genres */}
              <div
                role="menuitem"
                onClick={() => {
                  onSelectGenre(null);
                  setIsMobileGenresOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  minHeight: '48px',
                  cursor: 'pointer',
                  background: activeGenre === null ? 'rgba(124, 92, 255, 0.25)' : 'transparent',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  color: activeGenre === null ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: activeGenre === null ? 600 : 400,
                  fontSize: '0.92rem',
                }}
              >
                <span>All genres</span>
                {activeGenre === null && <Check size={16} color="var(--accent-violet)" />}
              </div>

              {genresList.map((g, idx) => {
                const isItemActive = activeGenre === g.name;
                return (
                  <div
                    key={g.name}
                    role="menuitem"
                    onClick={() => {
                      onSelectGenre(g.name);
                      setIsMobileGenresOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      minHeight: '48px',
                      cursor: 'pointer',
                      background: isItemActive ? 'rgba(124, 92, 255, 0.25)' : 'transparent',
                      borderBottom: idx < genresList.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                      color: isItemActive ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: isItemActive ? 600 : 400,
                      fontSize: '0.92rem',
                    }}
                  >
                    <span>{g.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {g.count}
                      </span>
                      {isItemActive && <Check size={16} color="var(--accent-violet)" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

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
                onKeyDown={handleSearchKeyDown}
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
                <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.4 }}>
                  No match found. Check the spelling, the catalogue has about 3,900 popular movies.
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
      {/* Mobile Full-Width My List Panel (< 900px) */}
      {isMobileMyListOpen && (
        <>
          <div
            onClick={() => {
              setIsMobileMyListOpen(false);
              setConfirmClear(false);
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

          <div
            ref={mobileMyListPanelRef}
            role="dialog"
            aria-label="My List"
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
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart size={18} fill="#ff4b72" color="#ff4b72" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                  My List ({favoriteCards.length})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {favoriteCards.length > 0 && (
                  confirmClear ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Clear?</span>
                      <button
                        type="button"
                        onClick={() => { clearFavorites(); setConfirmClear(false); }}
                        style={{
                          background: '#ff4b72',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          minHeight: '32px',
                        }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          minHeight: '32px',
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        padding: '8px',
                        textDecoration: 'underline',
                      }}
                    >
                      Clear all
                    </button>
                  )
                )}
                <button
                  onClick={() => { setIsMobileMyListOpen(false); setConfirmClear(false); }}
                  aria-label="Close My List"
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
            </div>

            {/* List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              maxHeight: 'calc(70dvh - 64px)',
            }}>
              {favoriteCards.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Heart size={40} color="var(--accent-violet)" style={{ opacity: 0.35, marginBottom: '12px' }} />
                  <p style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.96rem', marginBottom: '6px' }}>
                    Your list is empty
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Heart any movie to add it to your watchlist.
                  </p>
                </div>
              ) : (
                favoriteCards.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => {
                      onSelectMovieFromSearch(movie);
                      setIsMobileMyListOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                      minHeight: '56px',
                    }}
                  >
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      style={{ width: '42px', height: '62px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {movie.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <span>{movie.year || '—'}</span>
                        <span>&bull;</span>
                        <span>{movie.language_name}</span>
                        {movie.tmdb_rating > 0 && (
                          <>
                            <span>&bull;</span>
                            <span style={{ color: 'var(--accent-gold)' }}>★ {movie.tmdb_rating.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(movie.id);
                      }}
                      aria-label={`Remove ${movie.title} from My List`}
                      style={{
                        width: '44px',
                        height: '44px',
                        minWidth: '44px',
                        minHeight: '44px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
