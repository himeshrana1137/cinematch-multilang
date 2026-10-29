import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import LanguageSelector, { CHIPS } from './components/LanguageSelector';
import MoodSelector from './components/MoodSelector';
import Hero from './components/Hero';
import Carousel from './components/Carousel';
import MovieCard from './components/MovieCard';
import DetailModal from './components/DetailModal';
import { CardSkeleton, CarouselSkeleton, HeroSkeleton } from './components/SkeletonLoader';
import ErrorBanner from './components/ErrorBanner';
import Footer from './components/Footer';
import { Sparkles, TrendingUp, Film, RefreshCw, X, Heart, SmilePlus } from 'lucide-react';
import { useFavorites } from './context/FavoritesContext';

const STORAGE_CHIP_KEY = 'cinematch_active_chip';
const STORAGE_GENRE_KEY = 'cinematch_active_genre';
const STORAGE_MOOD_KEY = 'cm_mood_v1';

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

function getInitialMood() {
  try {
    const saved = localStorage.getItem(STORAGE_MOOD_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    console.warn('Could not read active mood from localStorage:', e);
  }
  return null;
}

export default function App() {
  const { favoriteCards, favoriteIds } = useFavorites();

  const [activeChipId, setActiveChipId] = useState(getInitialChip);
  const [activeGenre, setActiveGenre] = useState(getInitialGenre);
  const [activeMood, setActiveMood] = useState(getInitialMood);

  const [genresList, setGenresList] = useState([]);
  const [loadingGenres, setLoadingGenres] = useState(false);

  const [moodCounts, setMoodCounts] = useState({});

  const [heroMovie, setHeroMovie] = useState(null);
  const [pickedMovie, setPickedMovie] = useState(null);

  // Recommendations state (when a movie is picked)
  const [sameLanguageRecs, setSameLanguageRecs] = useState([]);
  const [otherLanguageRecs, setOtherLanguageRecs] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // "Picked for you" state (personalized from favorites)
  const [pickedForYouMovies, setPickedForYouMovies] = useState([]);
  const [loadingPickedForYou, setLoadingPickedForYou] = useState(false);

  // Surprise Me state
  const [last10SurpriseIds, setLast10SurpriseIds] = useState([]);
  const [loadingSurprise, setLoadingSurprise] = useState(false);

  // Popular state (when activeGenre is null and activeMood is null)
  const [popularMovies, setPopularMovies] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Browse state (when activeGenre or activeMood is set)
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

    fetch(`/api/genres?languages=${activeChip.queryValue}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!isMounted) return;
        setGenresList(data);
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
  }, [activeChip.queryValue, activeGenre]);

  // Fetch Moods counts for active language selection
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/moods?languages=${activeChip.queryValue}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!isMounted) return;
        const counts = {};
        for (const item of data) {
          counts[item.key] = item.count;
        }
        setMoodCounts(counts);
      })
      .catch((err) => console.error('Error fetching moods:', err));

    return () => { isMounted = false; };
  }, [activeChip.queryValue]);

  // Fetch Popular movies (when activeGenre is null and activeMood is null)
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

  // Fetch Browse movies (when activeGenre or activeMood is set)
  const fetchBrowse = useCallback(async (genreName, moodName) => {
    if (!genreName && !moodName) return;
    setLoadingBrowse(true);
    setError(null);
    try {
      const langParam = getLangQuery();
      const queryParam = genreName
        ? `genre=${encodeURIComponent(genreName)}`
        : `mood=${encodeURIComponent(moodName)}`;

      const res = await fetch(`/api/browse?${queryParam}&offset=0&limit=24${langParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBrowseMovies(data.items || []);
      setBrowseTotal(data.total || 0);

      // Default hero shows top movie of that language + genre / mood
      if (!pickedMovie && data.items && data.items.length > 0) {
        setHeroMovie(data.items[0]);
      }
    } catch (err) {
      console.error('Failed to load browse movies:', err);
      setError('Failed to browse movies.');
    } finally {
      setLoadingBrowse(false);
    }
  }, [getLangQuery, pickedMovie]);

  // Load more browse movies
  const handleLoadMoreBrowse = async () => {
    if ((!activeGenre && !activeMood) || loadingMore || browseMovies.length >= browseTotal) return;
    setLoadingMore(true);
    try {
      const langParam = getLangQuery();
      const offset = browseMovies.length;
      const queryParam = activeGenre
        ? `genre=${encodeURIComponent(activeGenre)}`
        : `mood=${encodeURIComponent(activeMood)}`;

      const res = await fetch(`/api/browse?${queryParam}&offset=${offset}&limit=24${langParam}`);
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

  // Re-fetch browse or popular whenever activeChip, activeGenre, or activeMood changes
  useEffect(() => {
    if (activeGenre) {
      fetchBrowse(activeGenre, null);
    } else if (activeMood) {
      fetchBrowse(null, activeMood);
    } else {
      fetchPopular();
    }
  }, [activeChipId, activeGenre, activeMood, fetchBrowse, fetchPopular]);

  // Fetch Picked For You recommendations from favourites (ignores genre/mood, follows active language chip)
  useEffect(() => {
    if (favoriteIds.length === 0) {
      setPickedForYouMovies([]);
      return;
    }

    let isMounted = true;
    setLoadingPickedForYou(true);

    fetch('/api/for_you', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: favoriteIds.slice(0, 10),
        n: 12,
        languages: activeChip.queryValue,
      }),
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted) setPickedForYouMovies(data);
      })
      .catch((err) => console.error('Error fetching for_you recommendations:', err))
      .finally(() => {
        if (isMounted) setLoadingPickedForYou(false);
      });

    return () => { isMounted = false; };
  }, [favoriteIds, activeChip.queryValue]);

  // Fetch Two-Row Recommendations for a target movie (unfiltered by chip/genre/mood)
  const fetchRecommendationsForTarget = useCallback(async (targetMovie) => {
    if (!targetMovie?.id) return;
    setLoadingRecs(true);
    try {
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
  // Switches automatically to "All", resets genre to null, resets mood to null
  const handleSelectMovieFromSearch = (movie) => {
    const chipChanged = activeChipId !== 'all';
    const genreChanged = activeGenre !== null;
    const moodChanged = activeMood !== null;

    if (chipChanged || genreChanged || moodChanged) {
      setActiveChipId('all');
      setActiveGenre(null);
      setActiveMood(null);
      try {
        localStorage.setItem(STORAGE_CHIP_KEY, 'all');
        localStorage.removeItem(STORAGE_GENRE_KEY);
        localStorage.removeItem(STORAGE_MOOD_KEY);
      } catch (e) {}

      if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
      setTransientNote('Showing all languages, genres & moods');
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
  // NEVER changes language chip, genre or mood!
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
    setPickedMovie(null);
    setSameLanguageRecs([]);
    setOtherLanguageRecs([]);
    try {
      localStorage.setItem(STORAGE_CHIP_KEY, chipId);
    } catch (e) {}
  };

  // Changing genre by hand clears active mood, clears picked movie and returns to default hero
  const handleSelectGenre = (genreName) => {
    if (genreName === activeGenre) return;
    setActiveGenre(genreName);
    setActiveMood(null); // Mutually exclusive with mood
    setPickedMovie(null);
    setSameLanguageRecs([]);
    setOtherLanguageRecs([]);
    try {
      if (genreName) {
        localStorage.setItem(STORAGE_GENRE_KEY, genreName);
      } else {
        localStorage.removeItem(STORAGE_GENRE_KEY);
      }
      localStorage.removeItem(STORAGE_MOOD_KEY);
    } catch (e) {}
  };

  // Changing mood by hand clears active genre, clears picked movie and returns to default hero
  const handleSelectMood = (moodId) => {
    if (moodId === activeMood) return;
    setActiveMood(moodId);
    setActiveGenre(null); // Mutually exclusive with genre
    setPickedMovie(null);
    setSameLanguageRecs([]);
    setOtherLanguageRecs([]);
    try {
      if (moodId) {
        localStorage.setItem(STORAGE_MOOD_KEY, moodId);
      } else {
        localStorage.removeItem(STORAGE_MOOD_KEY);
      }
      localStorage.removeItem(STORAGE_GENRE_KEY);
    } catch (e) {}
  };

  // Surprise Me handler: picks a random movie without changing active chip, genre, or mood
  const handleSurpriseMe = async () => {
    setLoadingSurprise(true);
    try {
      const langParam = activeChip.queryValue ? `&languages=${activeChip.queryValue}` : '';
      const genreParam = activeGenre ? `&genre=${encodeURIComponent(activeGenre)}` : '';
      const moodParam = activeMood ? `&mood=${encodeURIComponent(activeMood)}` : '';
      const excludeParam = last10SurpriseIds.length > 0 ? `&exclude=${last10SurpriseIds.join(',')}` : '';

      const res = await fetch(`/api/surprise?${langParam}${genreParam}${moodParam}${excludeParam}`);
      if (!res.ok) {
        if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
        setTransientNote('No surprise movies found with current filters');
        transientTimerRef.current = setTimeout(() => setTransientNote(null), 2500);
        return;
      }
      const movie = await res.json();
      setLast10SurpriseIds((prev) => [movie.id, ...prev.filter((id) => id !== movie.id)].slice(0, 10));

      handleSelectMovie(movie);

      if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
      setTransientNote(`Surprise pick: ${movie.title}`);
      transientTimerRef.current = setTimeout(() => setTransientNote(null), 2500);
    } catch (err) {
      console.error('Surprise Me error:', err);
    } finally {
      setLoadingSurprise(false);
    }
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
      {/* Sticky Glass Navbar with Search, Genres Dropdown & My List */}
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
        {error && (
          <ErrorBanner
            message={error}
            onRetry={
              activeGenre
                ? () => fetchBrowse(activeGenre, null)
                : activeMood
                ? () => fetchBrowse(null, activeMood)
                : fetchPopular
            }
          />
        )}

        {/* Single-select Language Chips & Info Line & Surprise Button & Transient Note */}
        <LanguageSelector
          activeChipId={activeChipId}
          onSelectChip={handleSelectChip}
          transientNote={transientNote}
          onSurprise={handleSurpriseMe}
          loadingSurprise={loadingSurprise}
        />

        {/* Mood Picker Chips (Under Language Chips) */}
        <MoodSelector
          activeMood={activeMood}
          onSelectMood={handleSelectMood}
          moodCounts={moodCounts}
        />

        {/* Hero Section */}
        {(loadingPopular && !heroMovie && !activeGenre && !activeMood) ||
        (loadingBrowse && !heroMovie && (activeGenre || activeMood)) ? (
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

        {/* 1. TWO RECOMMENDATION ROWS (Only shown when a movie has been picked) */}
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

        {/* 2. MY LIST CAROUSEL ROW (When user has >= 1 saved movie) */}
        {favoriteCards.length >= 1 && (
          <div style={{ marginBottom: '32px' }}>
            <Carousel
              title="My List"
              subtitle={`${favoriteCards.length} saved ${favoriteCards.length === 1 ? 'movie' : 'movies'} in your watchlist`}
              icon={Heart}
              movies={favoriteCards}
              onSelectMovie={handleSelectMovie}
              onOpenDetails={handleOpenDetails}
              selectedMovieId={heroMovie?.id}
            />
          </div>
        )}

        {/* 3. PICKED FOR YOU CAROUSEL ROW (When user has favorites, personalized recommendations) */}
        {favoriteCards.length >= 1 && (
          <div style={{ marginBottom: '32px' }}>
            {loadingPickedForYou ? (
              <CarouselSkeleton count={6} />
            ) : (
              pickedForYouMovies.length > 0 && (
                <Carousel
                  title={
                    favoriteIds.length <= 2 && favoriteCards.length > 0
                      ? `Because you liked ${favoriteCards[0]?.title || 'your saved movies'}`
                      : 'Picked for you'
                  }
                  subtitle={`Personalized hybrid matches based on your saved titles in ${currentCinemaLabel}`}
                  icon={Sparkles}
                  movies={pickedForYouMovies}
                  onSelectMovie={handleSelectMovie}
                  onOpenDetails={handleOpenDetails}
                  selectedMovieId={heroMovie?.id}
                />
              )
            )}
          </div>
        )}

        {/* 4. BROWSE SECTION */}
        {/* Case A: A Genre is active -> Responsive Grid with Load More */}
        {activeGenre ? (
          <section style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Film size={20} color="var(--accent-violet)" style={{ flexShrink: 0 }} />
                  <h2 className="cinematic-serif" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.7rem)', fontWeight: 700, color: '#ffffff', margin: 0, wordBreak: 'break-word' }}>
                    {activeGenre} movies
                  </h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '4px', margin: '4px 0 0 0' }}>
                  {currentCinemaLabel} &bull; {browseTotal} movies
                </p>
              </div>

              {/* Clear Genre Button (44px tap target) */}
              <button
                type="button"
                onClick={() => handleSelectGenre(null)}
                aria-label="Clear genre"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 14px',
                  minHeight: '44px',
                  height: '44px',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={15} />
                <span>Clear</span>
              </button>
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
                  Try another cinema or explore all genres.
                </p>
                <button
                  type="button"
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
                      type="button"
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
        ) : activeMood ? (
          /* Case B: A Mood is active -> Responsive Grid with Load More */
          <section style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SmilePlus size={20} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
                  <h2 className="cinematic-serif" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.7rem)', fontWeight: 700, color: '#ffffff', margin: 0, wordBreak: 'break-word' }}>
                    {activeMood} picks
                  </h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '4px', margin: '4px 0 0 0' }}>
                  {currentCinemaLabel} &bull; {browseTotal} movies
                </p>
              </div>

              {/* Clear Mood Button (44px tap target) */}
              <button
                type="button"
                onClick={() => handleSelectMood(null)}
                aria-label="Clear mood"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 14px',
                  minHeight: '44px',
                  height: '44px',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={15} />
                <span>Clear</span>
              </button>
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
                  No {activeMood} movies found in {currentCinemaLabel}.
                </p>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Try another mood or explore all movies.
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectMood(null)}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.88rem', minHeight: '44px' }}
                >
                  <RefreshCw size={15} style={{ marginRight: '6px' }} />
                  Reset to Any Mood
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
                      type="button"
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
          /* Case C: "All genres & Any mood" -> Popular Carousel */
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
