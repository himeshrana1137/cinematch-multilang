import React from 'react';
import { Clapperboard } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      marginTop: '80px',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '48px 24px 36px 24px',
      background: 'rgba(10, 10, 15, 0.95)',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #7c5cff 0%, #f5b942 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Clapperboard size={15} color="#ffffff" />
          </div>
          <span className="cinematic-serif" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
            CineMatch
          </span>
        </div>

        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: '600px'
        }}>
          Multi-Language Movie Discovery &amp; Hybrid Content-Quality Recommender covering Hollywood, Bollywood, Tollywood, Kollywood, Mollywood, Gujarati, Punjabi, Kannada, Marathi, and Bengali cinema.
        </p>

        {/* Required TMDB Attribution */}
        <p style={{
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.02em',
          marginTop: '6px'
        }}>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </footer>
  );
}
