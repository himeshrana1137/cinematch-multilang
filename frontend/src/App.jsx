import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import LanguageSelector, { LANGUAGES } from './components/LanguageSelector';
import Hero from './components/Hero';
import Carousel from './components/Carousel';
import HybridControl from './components/HybridControl';
import DetailModal from './components/DetailModal';
import { CardSkeleton, CarouselSkeleton, HeroSkeleton } from './components/SkeletonLoader';
import ErrorBanner from './components/ErrorBanner';
import Footer from './components/Footer';
import { Sparkles, TrendingUp, Compass, Film } from 'lucide-react';

const STORAGE_KEY = 'cinematch_selected_languages';

function getInitialLanguages() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read from localStorage:', e);
  }
  return ['all'];
}

export default function App() {
  const [selectedLanguages, setSelectedLanguages] = useState(getInitialLanguages);
  const [heroMovie, setHeroMovie] = useState(null);
  const [popularMovies, setPopularMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [alpha, setAlpha] = useState(0.7);

  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState(null);

  // Modal State
  const [modalMovie, setModalMovie] = useState(null);
  const [modalPlayTrailer, setModalPlayTrailer] = useState(false);

  const recsSectionRef = useRef(null);

  // Save languages to localStorage
  const saveLanguages = (langs) => {
    setSelectedLanguages(langs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(langs));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  };

  const handleToggleLanguage = (code) => {
    let next;
    if (selectedLanguages.includes('all')) {
      next = [code];
    } else if (selectedLanguages.includes(code)) {
      next = selectedLanguages.filter((c) => c !== code);
      if (next.length === 0) next = ['all'];
    } else {
      next = [...selectedLanguages, code];
    }
    saveLanguages(next);
  };

  const handleSelectAll = () => {
    saveLanguages(['all']);
  };

  // Helper to build languages query string
  const getLangQuery = useCallback(() => {
    if (!selectedLanguages || selectedLanguages.length === 0 || selectedLanguages.includes('all')) {
      return '';
    }
    return `&languages=${selectedLanguages.join(',')}`;
  }, [selectedLanguages]);

  // Fetch Popular movies
  const fetchPopular = useCallback(async () => {
    setLoadingPopular(true);
    setError(null);
    try {
      const query = getLangQuery();
      const res = await fetch(`/api/popular?n=18${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPopularMovies(data);

      // If no hero movie currently or if hero is not in active language set, set hero
      setHeroMovie((prev) => {
        if (!prev && data.length > 0) return data[0];
        return prev || (data.length > 0 ? data[0] : null);
      });
    } catch (err) {
      console.error('Failed to load popular movies:', err);
      setError('Failed to fetch movies. Please verify connection and retry.');
    } finally {
      setLoadingPopular(false);
    }
  }, [getLangQuery]);

  // Fetch Recommendations for a target movie
  const fetchRecommendations = useCallback(async (targetMovie, currentAlpha = alpha) => {
    if (!targetMovie?.id) return;
    setLoadingRecs(true);
    try {
      const query = getLangQuery();
      const res = await fetch(`/api/recommend?movie_id=${targetMovie.id}&n=18&alpha=${currentAlpha}${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  }, [alpha, getLangQuery]);

  // When languages change, refresh Popular and Recommendations
  useEffect(() => {
    fetchPopular();
  }, [fetchPopular]);

  // When heroMovie changes, fetch its recommendations
  useEffect(() => {
    if (heroMovie?.id) {
      fetchRecommendations(heroMovie, alpha);
    }
  }, [heroMovie?.id, fetchRecommendations]);

  // Handle selecting a movie (from search, card click, etc.)
  const handleSelectMovie = (movie) => {
    setHeroMovie(movie);
    fetchRecommendations(movie, alpha);
    // Smooth scroll to top of hero
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle hybrid slider change (alpha)
  const handleAlphaChange = (newAlpha) => {
    setAlpha(newAlpha);
    if (heroMovie?.id) {
      fetchRecommendations(heroMovie, newAlpha);
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

  // Language section subtitle
  const languageNames = selectedLanguages.includes('all')
    ? 'All Cinema'
    : selectedLanguages
        .map((c) => LANGUAGES.find((l) => l.code === c)?.label || c)
        .join(', ');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sticky Glass Navbar */}
      <Navbar onSelectMovie={handleSelectMovie} activeLanguages={selectedLanguages} />

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '24px 24px 0 24px' }}>
        {/* Error Banner */}
        {error && <ErrorBanner message={error} onRetry={fetchPopular} />}

        {/* Multi-language Selector Chips */}
        <LanguageSelector
          selectedLanguages={selectedLanguages}
          onToggleLanguage={handleToggleLanguage}
          onSelectAll={handleSelectAll}
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

        {/* Hybrid Recommendation Balance Control */}
        {heroMovie && (
          <HybridControl
            alpha={alpha}
            onAlphaChange={handleAlphaChange}
          />
        )}

        {/* Recommendations Section */}
        <div ref={recsSectionRef}>
          {loadingRecs ? (
            <CarouselSkeleton count={6} />
          ) : (
            recommendations.length > 0 && (
              <Carousel
                title={`Because you picked ${heroMovie?.title}`}
                subtitle={`Hybrid content & quality matches in ${languageNames}`}
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
              title={`Popular in ${languageNames}`}
              subtitle="Top rated and trending titles calculated via Bayesian quality scoring"
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
