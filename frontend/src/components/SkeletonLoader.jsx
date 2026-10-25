import React from 'react';

export function CardSkeleton() {
  return (
    <div className="snap-item" style={{ userSelect: 'none' }}>
      <div className="skeleton movie-card-poster-wrap" style={{ width: '100%', aspectRatio: '2 / 3', borderRadius: '16px' }} />
      <div style={{ padding: '12px 4px 4px 4px' }}>
        <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '8px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '12px', width: '50%', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

export function CarouselSkeleton({ count = 6 }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <div className="skeleton" style={{ height: '28px', width: '220px', marginBottom: '16px', borderRadius: '8px' }} />
      <div className="snap-carousel">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="skeleton" style={{
      width: '100%',
      height: '520px',
      borderRadius: '24px',
      marginBottom: '40px',
    }} />
  );
}
