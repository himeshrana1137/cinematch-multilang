import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Heart } from 'lucide-react';

const STORAGE_KEY = 'cm_favs_v1';
const MAX_FAVORITES = 300;

function readStoredIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
        .slice(0, MAX_FAVORITES);
    }
  } catch (e) {
    console.warn('Could not read favorites from localStorage:', e);
  }
  return [];
}

function saveStoredIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_FAVORITES)));
  } catch (e) {
    console.warn('Could not write favorites to localStorage:', e);
  }
}

const FavoritesContext = createContext({
  favoriteIds: [],
  favoriteCards: [],
  isFavorite: () => false,
  toggleFavorite: () => {},
  removeFavorite: () => {},
  clearFavorites: () => {},
  showToast: () => {},
});

export function FavoritesProvider({ children }) {
  const [favoriteIds, setFavoriteIds] = useState(readStoredIds);
  const [favoriteCards, setFavoriteCards] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2200);
  }, []);

  // Hydrate favorite cards whenever favoriteIds change
  useEffect(() => {
    if (favoriteIds.length === 0) {
      setFavoriteCards([]);
      return;
    }

    let isMounted = true;
    fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: favoriteIds.slice(0, 100) }),
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((cards) => {
        if (isMounted) {
          setFavoriteCards(cards);
        }
      })
      .catch((err) => console.error('Error fetching favorite cards:', err));

    return () => {
      isMounted = false;
    };
  }, [favoriteIds]);

  const isFavorite = useCallback(
    (id) => {
      if (!id) return false;
      const numId = Number(id);
      return favoriteIds.includes(numId);
    },
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    (movie) => {
      if (!movie || !movie.id) return;
      const numId = Number(movie.id);
      setFavoriteIds((prev) => {
        const exists = prev.includes(numId);
        let next;
        if (exists) {
          next = prev.filter((id) => id !== numId);
          setFavoriteCards((currentCards) => currentCards.filter((c) => c.id !== numId));
          showToast(`Removed from My List`);
        } else {
          next = [numId, ...prev.filter((id) => id !== numId)].slice(0, MAX_FAVORITES);
          setFavoriteCards((currentCards) => [movie, ...currentCards]);
          showToast(`Added to My List`);
        }
        saveStoredIds(next);
        return next;
      });
    },
    [showToast]
  );

  const removeFavorite = useCallback(
    (id) => {
      if (!id) return;
      const numId = Number(id);
      setFavoriteIds((prev) => {
        const next = prev.filter((x) => x !== numId);
        saveStoredIds(next);
        return next;
      });
      setFavoriteCards((prev) => prev.filter((c) => c.id !== numId));
      showToast('Removed from My List');
    },
    [showToast]
  );

  const clearFavorites = useCallback(() => {
    setFavoriteIds([]);
    setFavoriteCards([]);
    saveStoredIds([]);
    showToast('Cleared My List');
  }, [showToast]);

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoriteCards,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        clearFavorites,
        showToast,
      }}
    >
      {children}

      {/* Transient Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(18, 18, 28, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(124, 92, 255, 0.4)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.88rem',
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.75), 0 0 16px var(--accent-violet-glow)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          <Heart size={16} fill="var(--accent-gold)" color="var(--accent-gold)" />
          <span>{toast}</span>
        </div>
      )}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
