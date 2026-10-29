import React from 'react';
import { Clapperboard, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      marginTop: 'clamp(40px, 6vw, 80px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: 'clamp(32px, 5vw, 48px) 16px calc(clamp(28px, 5vw, 44px) + env(safe-area-inset-bottom, 0px)) 16px',
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
          maxWidth: '600px',
          margin: 0,
        }}>
          Multi-Language Movie Discovery &amp; Hybrid Content-Quality Recommender covering Hollywood, Bollywood/Hindi, Gujarati, Tollywood, Kollywood, Mollywood and Kannada cinema.
        </p>

        {/* Required TMDB Attribution */}
        <p style={{
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.02em',
          marginTop: '6px',
          marginBottom: '2px',
        }}>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>

        {/* Thin Divider Line */}
        <div style={{
          width: 'min(240px, 60%)',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12) 30%, rgba(255, 255, 255, 0.12) 70%, transparent)',
          margin: '8px auto 4px auto',
        }} />

        {/* Developer Credit at Very Bottom: Stylish, First Name Only */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          paddingTop: '4px',
          userSelect: 'none',
        }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11.5px',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }}>
            Developed by
          </span>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}>
            <Sparkles size={14} color="#7c5cff" style={{ opacity: 0.75, flexShrink: 0 }} />
            <span
              className="dev-credit-name"
              style={{
                fontFamily: "'Dancing Script', cursive, sans-serif",
                fontWeight: 700,
                color: '#f5b942', // solid fallback
                background: 'linear-gradient(135deg, #7c5cff 10%, #d4b5ff 45%, #f5b942 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 10px rgba(124, 92, 255, 0.35))',
                lineHeight: 1.2,
                display: 'inline-block',
              }}
            >
              Himesh
            </span>
            <Sparkles size={14} color="#f5b942" style={{ opacity: 0.75, flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </footer>
  );
}
