import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';

export default function Carousel({ title, subtitle, icon: Icon, movies, onSelectMovie, onOpenDetails, selectedMovieId }) {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div style={{ marginBottom: '32px', position: 'relative' }}>
      {/* Carousel Header: icon aligned to first line of wrapped heading */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '10px',
        padding: '0 2px'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '3px' }}>
            {Icon && <Icon size={20} color="var(--accent-violet)" style={{ flexShrink: 0, marginTop: '3px' }} />}
            <h2 className="cinematic-serif" style={{
              fontSize: 'clamp(20px, 5vw, 25px)',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
              wordBreak: 'break-word',
            }}>
              {title}
            </h2>
          </div>
          {subtitle && (
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              paddingLeft: Icon ? '28px' : '0',
              lineHeight: 1.35,
            }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Scroll Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginTop: '2px' }}>
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-violet)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-violet)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Snap Scroll Row */}
      <div ref={scrollContainerRef} className="snap-carousel">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onSelect={onSelectMovie}
            onOpenDetails={onOpenDetails}
            isSelected={selectedMovieId === movie.id}
          />
        ))}
      </div>
    </div>
  );
}
