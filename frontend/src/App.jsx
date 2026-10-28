import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import LanguageSelector, { CHIPS } from './components/LanguageSelector';
import Hero from './components/Hero';
import Carousel from './components/Carousel';
import MovieCard from './components/MovieCard';
import DetailModal from './components/DetailModal';
import { CardSkeleton, CarouselSkeleton, HeroSkeleton } from './components/SkeletonLoader';
import ErrorBanner from './components/ErrorBanner';
import Footer from './components/Footer';
import { Sparkles, TrendingUp, Film, RefreshCw } from 'lucide-react';

const STORAGE_CHIP_KEY = 'cinematch_active_chip';
const STORAGE_GENRE_KEY = 'cinematch_active_genre';

function getInitialChip() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlChip = urlParams.get('cinema') || urlParams.get('lang');
    if (urlChip && CHIPS.some((c) => c.id === urlChip)) {
      return urlChip;
    }
    const saved = localStorage.getItem(STORAGE_CHIP_KEY);
    if (saved && CHIPS.some((c) => c.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Could not read active chip from localStorage:', e);
  }
  return 'all';
}

function getInitialGenre() {
  try {
    const saved = localStorage.getItem(STORAGE_GENRE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    console.warn('Could not read active genre from localStorage:', e);
  }
  return null;
}

export default function App() {
  const [activeChipId, setActiveChipId] = useState(getInitialChip);
  const [activeGenre, setActiveGenre] = useState(getInitialGenre);
  const [genresList, setGenresList] = useState([]);
  const [loadingGenres, setLoadingGenres] = useState(false);

  const [heroMovie, setHeroMovie] = useState(null);
  const [pickedMovie, setPickedMovie] = useState(null);

  // Recommendations state
  const [sameLanguageRecs, setSameLanguageRecs] = useState([]);
  const [otherLanguageRecs, setOtherLanguageRecs] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Popular state (when activeGenre is null)
  const [popularMovies, setPopularMovies] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Browse state (when activeGenre is active)
  const [browseMovies, setBrowseMovies] = useState([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState(null);
  const [transientNote, setTransientNote] = useState(null);

  // Modal State
  const [modalMovie, setModalMovie] = useState(null);
  const [modalPlayTrailer, setModalPlayTrailer] = useState(false);

  const recsSectionRef = useRef(null);
  const transientTimerRef = useRef(null);

  // Active chip object
  const activeChip = CHIPS.find((c) => c.id === activeChipId) || CHIPS[0];

  // Helper to build languages query string
  const getLangQuery = useCallback(() => {
    if (!activeChip.queryValue) return '';
    return `&languages=${activeChip.queryValue}`;
  }, [activeChip.queryValue]);

  // Fetch Genres for active language selection
  useEffect(() => {
    let isMounted = true;
    setLoadingGenres(true);
    const langParam = getLangQuery();

    fetch(`/api/genres?languages=${activeChip.queryValue}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!isMounted) return;
        setGenresList(data);
        // If remembered genre does not exist for current language chip, fall back to "All genres"
        if (activeGenre && !data.some((g) => g.name === activeGenre)) {
          setActiveGenre(null);
          try {
            localStorage.removeItem(STORAGE_GENRE_KEY);
          } catch (e) {}
        }
      })
      .catch((err) => console.error('Error fetching genres:', err))
      .finally(() => {
        if (isMounted) setLoadingGenres(false);
      });

    return () => { isMounted = false; };
  }, [activeChip.queryValue, getLangQuery]);

  // Fetch Popular movies (when activeGenre is null)
  const fetchPopular = useCallback(async () => {
    setLoadingPopular(true);
    setError(null);
    try {
      const langParam = getLangQuery();
      const res = await fetch(`/api/popular?n=18${langParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPopularMovies(data);

      // Hero switches to top popular movie if no picked movie
      if (!pickedMovie && data.length > 0) {
        setHeroMovie(data[0]);
      }
    } catch (err) {
      console.error('Failed to load popular movies:', err);
      setError('Failed to fetch movies. Please check connection and retry.');
    } finally {
      setLoadingPopular(false);
    }
  }, [getLangQuery, pickedMovie]);

  // Fetch Browse movies (when activeGenre is set)
  const fetchBrowse = useCallback(async (genreName) => {
    if (!genreName) return;
    setLoadingBrowse(true);
    setError(null);
    try {
      const langParam = getLangQuery();
      const res = await fetch(`/api/browse?genre=${encodeURIComponent(genreName)}&offset=0&limit=24${langParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBrowseMovies(data.items || []);
      setBrowseTotal(data.total || 0);

      // Default hero shows top movie of that language + genre
      if (!pickedMovie && data.items && data.items.length > 0) {
        setHeroMovie(data.items[0]);
      }
    } catch (err) {
      console.error('Failed to load browse movies:', err);
      setError('Failed to browse genre movies.');
    } finally {
      setLoadingBrowse(false);
    }
  }, [getLangQuery, pickedMovie]);

  // Load more browse movies
  const handleLoadMoreBrowse = async () => {
    if (!activeGenre || loadingMore || browseMovies.length >= browseTotal) return;
    setLoadingMore(true);
    try {
      const langParam = getLangQuery();
      const offset = browseMovies.length;
      const res = await fetch(`/api/browse?genre=${encodeURIComponent(activeGenre)}&offset=${offset}&limit=24${langParam}`);
      if (res.ok) {
        const data = await res.json();
        setBrowseMovies((prev) => [...prev, ...(data.items || [])]);
      }
    } catch (err) {
      console.error('Error loading more movies:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Re-fetch browse or popular whenever activeChip or activeGenre changes
  useEffect(() => {
    if (activeGenre) {
      fetchBrowse(activeGenre);
    } else {
      fetchPopular();
    }
  }, [activeChipId, activeGenre, fetchBrowse, fetchPopular]);

  // Fetch Two-Row Recommendations for a target movie (unfiltered by chip/genre)
  const fetchRecommendationsForTarget = useCallback(async (targetMovie) => {
    if (!targetMovie?.id) return;
    setLoadingRecs(true);
    try {
      // Called WITHOUT language or genre filters
      const res = await fetch(`/api/recommend?movie_id=${targetMovie.id}&n=12`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSameLanguageRecs(data.same_language || []);
      setOtherLanguageRecs(data.other_languages || []);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  // When user picks a movie FROM SEARCH RESULTS:
  // Switches automatically to "All", resets genre to "All genres", shows transient note
  const handleSelectMovieFromSearch = (movie) => {
    const chipChanged = activeChipId !== 'all';
    const genreChanged = activeGenre !== null;

    if (chipChanged || genreChanged) {
      setActiveChipId('all');
      setActiveGenre(null);
      try {
        localStorage.setItem(STORAGE_CHIP_KEY, 'all');
        localStorage.removeItem(STORAGE_GENRE_KEY);
      } catch (e) {}

      // Transient note near chips
      if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
      setTransientNote('Showing all languages and genres');
      transientTimerRef.current = setTimeout(() => {
        setTransientNote(null);
      }, 2200);
    }

    setPickedMovie(movie);
    setHeroMovie(movie);
    fetchRecommendationsForTarget(movie);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When user clicks a card, "More Like This" or a recommendation:
  // NEVER changes the language chip or the genre!
  const handleSelectMovie = (movie) => {
    setPickedMovie(movie);
    setHeroMovie(movie);
    fetchRecommendationsForTarget(movie);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Changing language chip by hand clears picked movie and returns to default hero
  const handleSelectChip = (chipId) => {
    if (chipId === activeChipId) return;
    setActiveChipId(chipId);
    setPickedMovie(null); // Clears picked movie
    setSameLanguageRecs([]);
    setOtherLanguageRecs([]);
    try {
      localStorage.setItem(STORAGE_CHIP_KEY, chipId);
    } catch (e) {}
  };

  // Changing genre by hand clears picked movie and returns to default hero
  const handleSelectGenre = (genreName) => {
    if (genreName === activeGenre) return;
    setActiveGenre(genreName);
    setPickedMovie(null); // Clears picked movie
    setSameLanguageRecs([]);
    setOtherLanguageRecs([]);
    try {
      if (genreName) {
        localStorage.setItem(STORAGE_GENRE_KEY, genreName);
      } else {
        localStorage.removeItem(STORAGE_GENRE_KEY);
      }
    } catch (e) {}
  };

  const handleOpenTrailer = (movie) => {
    setModalMovie(movie);
    setModalPlayTrailer(true);
  };

  const handleOpenDetails = (movie) => {
    setModalMovie(movie);
    setModalPlayTrailer(false);
  };

  const handleCloseModal = () => {
    setModalMovie(null);
    setModalPlayTrailer(false);
  };

  const scrollToRecommendations = () => {
    recsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Support direct modal opening via ?movie=<id>
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const movieIdParam = urlParams.get('movie');
    if (movieIdParam) {
      fetch(`/api/movie/${movieIdParam}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((m) => {
          if (m) {
            setModalMovie(m);
            setModalPlayTrailer(false);
          }
        })
        .catch((err) => console.error('Error opening movie from query param:', err));
    }
  }, []);

  const currentCinemaLabel = activeChip.label === 'All' ? 'All Cinema' : activeChip.label;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sticky Glass Navbar with Search, Developer Label & Genres Dropdown */}
      <Navbar
        onSelectMovieFromSearch={handleSelectMovieFromSearch}
        activeGenre={activeGenre}
        onSelectGenre={handleSelectGenre}
        genresList={genresList}
        loadingGenres={loadingGenres}
      />

      {/* Main Container */}
      <main className="main-container">
        {/* Error Banner */}
        {error && <ErrorBanner message={error} onRetry={activeGenre ? () => fetchBrowse(activeGenre) : fetchPopular} />}

        {/* Single-select Language Chips & Info Line & Transient Note */}
        <LanguageSelector
          activeChipId={activeChipId}
          onSelectChip={handleSelectChip}
          transientNote={transientNote}
        />

        {/* Hero Section */}
        {(loadingPopular && !heroMovie && !activeGenre) || (loadingBrowse && !heroMovie && activeGenre) ? (
          <HeroSkeleton />
        ) : (
          heroMovie && (
            <Hero
              movie={heroMovie}
              onOpenTrailer={handleOpenTrailer}
              onScrollToRecommendations={scrollToRecommendations}
            />
          )
        )}

        {/* PART 2: TWO RECOMMENDATION ROWS (Only shown when a movie has been picked) */}
        {pickedMovie && (
          <div ref={recsSectionRef} style={{ marginBottom: '32px' }}>
            {loadingRecs ? (
              <CarouselSkeleton count={6} />
            ) : (
              <>
                {/* Row 1: Same Language */}
                {sameLanguageRecs.length > 0 && (
                  <Carousel
                    title={`Because you picked ${pickedMovie.title}`}
                    subtitle={`Top hybrid matches in ${pickedMovie.language_name || 'original language'}`}
                    icon={Sparkles}
                    movies={sameLanguageRecs}
                    onSelectMovie={handleSelectMovie}
                    onOpenDetails={handleOpenDetails}
                    selectedMovieId={heroMovie?.id}
                  />
                )}

                {/* Row 2: Similar in other languages */}
                {otherLanguageRecs.length > 0 && (
                  <Carousel
                    title="Similar in other languages"
                    subtitle="Cross-language discoveries with similar thematic DNA and high quality"
                    icon={Film}
                    movies={otherLanguageRecs}
                    onSelectMovie={handleSelectMovie}
                    onOpenDetails={handleOpenDetails}
                    selectedMovieId={heroMovie?.id}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* PART 4: BROWSE SECTION */}
        {/* Case A: A Genre is active -> Responsive Grid with Load More */}
        {activeGenre ? (
          <section style={{ marginBottom: '40px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={20} color="var(--accent-violet)" />
                <h2 className="cinematic-serif" style={{ fontSize: 'clamp(1.3rem, 4vw, 1.7rem)', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  {activeGenre} movies
                </h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '4px' }}>
                {currentCinemaLabel} &bull; {browseTotal} movies
              </p>
            </div>

            {loadingBrowse ? (
              <div className="genre-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : browseMovies.length === 0 ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '40px 24px',
                textAlign: 'center',
                margin: '20px 0',
              }}>
                <p style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '8px', fontWeight: 600 }}>
                  No {activeGenre} movies in {currentCinemaLabel} yet.
                </p>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Try another language or explore all genres.
                </p>
                <button
                  onClick={() => handleSelectGenre(null)}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.88rem', minHeight: '44px' }}
                >
                  <RefreshCw size={15} style={{ marginRight: '6px' }} />
                  Reset to All Genres
                </button>
              </div>
            ) : (
              <>
                <div className="genre-grid">
                  {browseMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onSelect={handleSelectMovie}
                      onOpenDetails={handleOpenDetails}
                      isSelected={heroMovie?.id === movie.id}
                    />
                  ))}
                </div>

                {browseMovies.length < browseTotal && (
                  <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '32px' }}>
                    <button
                      onClick={handleLoadMoreBrowse}
                      disabled={loadingMore}
                      className="btn-secondary"
                      style={{
                        padding: '12px 28px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        minHeight: '44px',
                        cursor: loadingMore ? 'wait' : 'pointer',
                      }}
                    >
                      {loadingMore ? 'Loading more movies...' : `Load more (${browseMovies.length} of ${browseTotal})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          /* Case B: "All genres" -> Popular Carousel */
          loadingPopular ? (
            <CarouselSkeleton count={6} />
          ) : (
            popularMovies.length > 0 && (
              <Carousel
                title={`Popular in ${currentCinemaLabel}`}
                subtitle="Top rated and trending titles ordered by Bayesian quality score"
                icon={TrendingUp}
                movies={popularMovies}
                onSelectMovie={handleSelectMovie}
                onOpenDetails={handleOpenDetails}
                selectedMovieId={heroMovie?.id}
              />
            )
          )
        )}
      </main>

      {/* Detail & Trailer Modal */}
      {modalMovie && (
        <DetailModal
          movie={modalMovie}
          autoPlayTrailer={modalPlayTrailer}
          onClose={handleCloseModal}
          activeChipId={activeChipId}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
