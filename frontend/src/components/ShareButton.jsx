import React, { useState, useRef } from 'react';
import { Share2, Check, Copy, X } from 'lucide-react';

export default function ShareButton({ movie, onToast, style = {} }) {
  const [showFallback, setShowFallback] = useState(false);
  const [internalToast, setInternalToast] = useState(null);
  const [copiedFallback, setCopiedFallback] = useState(false);
  const inputRef = useRef(null);

  if (!movie || !movie.id) return null;

  const handleShare = async (e) => {
    e.stopPropagation();

    // Link format: <site origin>/?movie=<id>
    const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
    const shareUrl = `${origin}/?movie=${movie.id}`;
    const shareText = `Check out "${movie.title}" on CineMatch:`;

    // 1. Try native navigator.share if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${movie.title} — CineMatch`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          return; // User cancelled share sheet
        }
        // If native share rejected or failed, fall through to clipboard
      }
    }

    // 2. Try Clipboard API
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      }
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, trying execCommand:', err);
    }

    if (!copied) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (e) {
        console.warn('execCommand copy failed:', e);
      }
    }

    if (copied) {
      if (onToast) {
        onToast('Link copied');
      } else {
        setInternalToast('Link copied');
        setTimeout(() => setInternalToast(null), 2500);
      }
      return;
    }

    // 3. Fallback: Selectable input field dialog
    setShowFallback(true);
    setCopiedFallback(false);
  };

  const handleCopyInput = () => {
    if (inputRef.current) {
      inputRef.current.select();
      try {
        document.execCommand('copy');
        setCopiedFallback(true);
        if (onToast) onToast('Link copied');
      } catch (err) {
        console.warn('execCommand copy failed:', err);
      }
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/?movie=${movie.id}`;

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share this movie"
        title="Share this movie"
        className="btn-secondary"
        style={{
          width: '44px',
          height: '44px',
          minWidth: '44px',
          minHeight: '44px',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#ffffff',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(124, 92, 255, 0.25)';
          e.currentTarget.style.borderColor = 'rgba(124, 92, 255, 0.55)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = style.background || 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.borderColor = style.border ? undefined : 'rgba(255, 255, 255, 0.15)';
        }}
      >
        <Share2 size={18} color="#ffffff" />
      </button>

      {/* Internal toast if no external onToast provided */}
      {internalToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(139, 92, 246, 0.6)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '9999px',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          <Check size={16} color="#4ade80" />
          <span>{internalToast}</span>
        </div>
      )}

      {/* Selectable Fallback Modal when clipboard is blocked */}
      {showFallback && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '16px',
          }}
          onClick={() => setShowFallback(false)}
        >
          <div
            style={{
              background: '#151520',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Share &ldquo;{movie.title}&rdquo;
              </h3>
              <button
                type="button"
                onClick={() => setShowFallback(false)}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '14px' }}>
              Copy the movie link below to share with friends:
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <input
                ref={inputRef}
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                autoFocus
                style={{
                  flex: 1,
                  background: '#0a0a0f',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleCopyInput}
                className="btn-primary"
                style={{
                  padding: '10px 16px',
                  fontSize: '0.86rem',
                  whiteSpace: 'nowrap',
                  gap: '6px',
                }}
              >
                {copiedFallback ? <Check size={16} /> : <Copy size={16} />}
                {copiedFallback ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowFallback(false)}
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.86rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
