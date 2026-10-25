import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import LanguageSelector, { CHIPS } from './components/LanguageSelector';
import Hero from './components/Hero';
import Carousel from './components/Carousel';
import DetailModal from './components/DetailModal';
import { CardSkeleton, CarouselSkeleton, HeroSkeleton } from './components/SkeletonLoader';
import ErrorBanner from './components/ErrorBanner';
import Footer from './components/Footer';
import { Sparkles, TrendingUp } from 'lucide-react';

const STORAGE_KEY = 'cinematch_active_chip';

function getInitialChip() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlChip = urlParams.get('cinema') || urlParams.get('lang');
    if (urlChip && CHIPS.some((c) => c.id === urlChip)) {
      return urlChip;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && CHIPS.some((c) => c.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Could not read active chip from localStorage:', e);
  }
  return 'all';
}

export default function App() {
  const [activeChipId, setActiveChipId] = useState(getInitialChip);
  const [heroMovie, setHeroMovie] = useState(null);
  const [popularMovies, setPopularMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState(null);

  // Modal State
  const [modalMovie, setModalMovie] = useState(null);
  const [modalPlayTrailer, setModalPlayTrailer] = useState(false);

  const recsSectionRef = useRef(null);

  // Active chip object
  const activeChip = CHIPS.find((c) => c.id === activeChipId) || CHIPS[0];

  // Helper to build languages query string
  const getLangQuery = useCallback(() => {
    if (!activeChip.queryValue) return '';
    return `&languages=${activeChip.queryValue}`;
  }, [activeChip.queryValue]);

  // Handle single-select chip change
  const handleSelectChip = (chipId) => {
    if (chipId === activeChipId) return; // Already active

    setActiveChipId(chipId);
    try {
      localStorage.setItem(STORAGE_KEY, chipId);
    } catch (e) {
      console.warn('Could not save active chip to localStorage:', e);
    }
  };

  // Fetch Popular movies and update Hero
  const fetchPopular = useCallback(async () => {
    setLoadingPopular(true);
    setError(null);
    try {
      const langParam = getLangQuery();
      const res = await fetch(`/api/popular?n=18${langParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPopularMovies(data);

      // Hero must switch to a movie from that language/selection
      if (data.length > 0) {
        setHeroMovie(data[0]);
      }
    } catch (err) {
      console.error('Failed to load popular movies:', err);
      setError('Failed to fetch movies. Please check connection and retry.');
    } finally {
      setLoadingPopular(false);
    }
  }, [getLangQuery]);

  // Fetch Recommendations (fixed 70/30 blend on backend, no alpha parameter sent)
  const fetchRecommendations = useCallback(async (targetMovie) => {
    if (!targetMovie?.id) return;
    setLoadingRecs(true);
    try {
      const langParam = getLangQuery();
      const res = await fetch(`/api/recommend?movie_id=${targetMovie.id}&n=18${langParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  }, [getLangQuery]);

  // When activeChip changes, refresh Popular (which updates Hero)
  useEffect(() => {
    fetchPopular();
  }, [fetchPopular]);

  // When heroMovie changes, fetch recommendations for it
  useEffect(() => {
    if (heroMovie?.id) {
      fetchRecommendations(heroMovie);
    }
  }, [heroMovie?.id, fetchRecommendations]);

  // Handle clicking a card
  const handleSelectMovie = (movie) => {
    setHeroMovie(movie);
    fetchRecommendations(movie);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const currentCinemaLabel = activeChip.label === 'All' ? 'All Cinema' : activeChip.label;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sticky Glass Navbar with search */}
      <Navbar onSelectMovie={handleSelectMovie} activeQueryValue={activeChip.queryValue} />

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '24px 24px 0 24px' }}>
        {/* Error Banner */}
        {error && <ErrorBanner message={error} onRetry={fetchPopular} />}

        {/* Single-select Language Chips & Info Line */}
        <LanguageSelector
          activeChipId={activeChipId}
          onSelectChip={handleSelectChip}
        />

        {/* Hero Section */}
        {loadingPopular && !heroMovie ? (
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

        {/* Recommendations Section */}
        <div ref={recsSectionRef}>
          {loadingRecs ? (
            <CarouselSkeleton count={6} />
          ) : (
            recommendations.length > 0 && (
              <Carousel
                title={`Because you picked ${heroMovie?.title}`}
                subtitle={`Hybrid content & quality matches in ${currentCinemaLabel}`}
                icon={Sparkles}
                movies={recommendations}
                onSelectMovie={handleSelectMovie}
                onOpenDetails={handleOpenDetails}
                selectedMovieId={heroMovie?.id}
              />
            )
          )}
        </div>

        {/* Popular Carousel */}
        {loadingPopular ? (
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
        )}
      </main>

      {/* Detail & Trailer Modal */}
      {modalMovie && (
        <DetailModal
          movie={modalMovie}
          autoPlayTrailer={modalPlayTrailer}
          onClose={handleCloseModal}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
