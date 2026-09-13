import React, { useEffect, useState } from 'react';
import type {
  DetectedMediaCandidate,
  ResolvedMediaItem,
} from '../../../src/detection/types';
import {
  addCandidateToLibrary,
  dismissCandidate,
  getCurrentDetectionState,
  resolveCandidateMedia,
  triggerManualDetection,
} from '../../../src/detection/client';
import { sendExtensionMessage } from '../../../src/auth/messages';
import { TrackingCard } from './TrackingCard';
import { startActiveTabTracking } from '../../../src/tracking/client';

export function MediaDetectionCard() {
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [candidate, setCandidate] = useState<DetectedMediaCandidate | null>(null);
  const [resolvedItems, setResolvedItems] = useState<ResolvedMediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ResolvedMediaItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);

  // Initialize and load current tab detection
  useEffect(() => {
    let mounted = true;

    async function loadState() {
      setLoading(true);
      try {
        const state = await getCurrentDetectionState();
        if (!mounted) return;

        if (state.candidate) {
          setCandidate(state.candidate);
          setCustomSearchQuery(state.candidate.titleHint || '');
          // Automatically trigger catalog resolution
          void resolveMedia(state.candidate);
        } else {
          setCandidate(null);
          setCustomSearchQuery('');
        }
      } catch {
        // Background might be waking up
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadState();
    return () => {
      mounted = false;
    };
  }, []);

  async function resolveMedia(cand: DetectedMediaCandidate, customTitle?: string) {
    setResolving(true);
    setStatusMessage(null);
    setActionSuccess(null);

    try {
      const candidateToResolve = customTitle
        ? { ...cand, titleHint: customTitle }
        : cand;

      const res = await resolveCandidateMedia(candidateToResolve);
      if (res && res.success) {
        const candidates = res.candidates || [];
        setResolvedItems(candidates);

        if (candidates.length > 0) {
          // If high confidence or top match exists, auto-select top candidate
          setSelectedItem(candidates[0] ?? null);
          setStatusMessage(null);
          if (!customTitle) {
            setShowManualSearch(false);
          }
        } else {
          setSelectedItem(null);
          setShowManualSearch(true);
          setStatusMessage(res.message || 'No direct catalog match found. Try refining the title below.');
        }
      } else if (res?.error) {
        setSelectedItem(null);
        setShowManualSearch(true);
        setStatusMessage(res.error);
      }
    } catch {
      setSelectedItem(null);
      setStatusMessage('Failed to contact Vrate catalog.');
    } finally {
      setResolving(false);
    }
  }

  async function handleManualDetect() {
    setDetecting(true);
    setStatusMessage(null);
    setActionSuccess(null);

    try {
      const res = await triggerManualDetection();
      if (res.candidate) {
        setCandidate(res.candidate);
        setCustomSearchQuery(res.candidate.titleHint || '');
        await resolveMedia(res.candidate);
      } else {
        setCandidate(null);
        setResolvedItems([]);
        setSelectedItem(null);
        setCustomSearchQuery('');
      }
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to run detection.');
    } finally {
      setDetecting(false);
    }
  }

  async function handleDismiss() {
    try {
      await dismissCandidate();
      setCandidate(null);
      setResolvedItems([]);
      setSelectedItem(null);
      setActionSuccess(null);
      setShowManualSearch(false);
    } catch {
      // ignore
    }
  }

  async function handleAddToLibrary(status: 'watchlist' | 'watching') {
    const itemToAdd = selectedItem;
    if (!itemToAdd && !candidate) return;

    const provider = itemToAdd ? itemToAdd.provider : candidate?.provider;
    const externalId = itemToAdd ? itemToAdd.externalId : candidate?.externalId;

    if (!provider || provider === 'unknown' || !externalId) {
      setStatusMessage('Please select a matching catalog item first.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await addCandidateToLibrary(
        provider,
        externalId,
        status,
        candidate?.episodeNumber,
        candidate?.sourceName,
        candidate?.sourceDomain
      );

      if (res.success) {
        setActionSuccess(
          status === 'watchlist'
            ? 'Successfully added to Watchlist!'
            : 'Added to Watching! Tracking started.'
        );
        // Mark selected item as added in library
        if (selectedItem) {
          setSelectedItem({
            ...selectedItem,
            inLibrary: true,
            libraryStatus: status,
            libraryEntryId: res.entryId,
          });
        }

        if (status === 'watching' && res.entryId) {
          void startActiveTabTracking({
            libraryEntryId: res.entryId,
            mediaId: res.mediaId || selectedItem?.externalId || res.entryId,
            episodeNumber: candidate?.episodeNumber,
            seasonNumber: candidate?.seasonNumber,
            sourceName: candidate?.sourceName || 'web',
            sourceDomain: candidate?.sourceDomain || 'unknown',
          });
        }
      } else {
        setStatusMessage(res.error || res.message || 'Failed to add to library.');
      }
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const openDashboardDiscover = () => {
    void sendExtensionMessage({
      type: 'OPEN_URL',
      payload: { url: '/dashboard/discover' },
    });
  };

  const openDashboardEntry = (entryId?: string | null) => {
    if (entryId) {
      void sendExtensionMessage({
        type: 'OPEN_URL',
        payload: { url: `/dashboard/library/${entryId}` },
      });
    } else {
      openDashboardDiscover();
    }
  };

  if (loading || detecting) {
    return (
      <div className="detection-card">
        <div className="detection-header">
          <span className="detection-label">Page Detection</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0' }}>
          <div className="status-dot" style={{ backgroundColor: '#FF5C35', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: '12px', color: '#A3A3A3' }}>Checking page…</span>
        </div>
      </div>
    );
  }

  // Sub-component: Active Candidate Detected
  if (candidate) {
    const isMiruro = candidate.sourceName === 'miruro';
    const isCandidateReady = Boolean(
      selectedItem &&
      selectedItem.externalId &&
      selectedItem.provider
    );

    const confidenceLabel =
      isCandidateReady
        ? 'Matched'
        : candidate.confidence >= 0.8
        ? 'Strong match'
        : candidate.confidence >= 0.5
        ? 'Probable match'
        : 'Needs confirmation';

    const confidenceClass =
      isCandidateReady || candidate.confidence >= 0.8
        ? 'confidence-high'
        : candidate.confidence >= 0.5
        ? 'confidence-medium'
        : 'confidence-low';

    const displayTitle = selectedItem ? selectedItem.title : candidate.titleHint;
    const displayPoster = selectedItem?.posterUrl;
    const mediaTypeLabel = selectedItem
      ? selectedItem.mediaType === 'movie'
        ? 'Movie'
        : 'Series'
      : isMiruro
      ? 'Anime'
      : 'Media';

    const inLibrary = Boolean(selectedItem?.inLibrary);
    const libraryStatusText =
      selectedItem?.libraryStatus === 'watching'
        ? 'Watching'
        : selectedItem?.libraryStatus === 'watchlist'
        ? 'Watchlist'
        : selectedItem?.libraryStatus === 'completed'
        ? 'Completed'
        : selectedItem?.libraryStatus;

    return (
      <div className="detection-section">
        <div className="detection-card">
          <div className="detection-header">
            <span className="detection-label">
              {isMiruro ? 'Detected from AniList ID' : 'Detected Media'}
            </span>
            <span className={`confidence-pill ${confidenceClass}`}>
              {confidenceLabel}
            </span>
          </div>

          {/* Resolving Status Indicator */}
          {resolving && (
            <div className="resolving-badge">
              <div className="status-dot" style={{ backgroundColor: '#FF5C35', animation: 'pulse 1s infinite' }} />
              <span>Matching with Vrate, TMDB & AniList…</span>
            </div>
          )}

          {/* Media Preview Box */}
          <div className="media-preview-box">
            {displayPoster ? (
              <img
                src={displayPoster}
                alt={displayTitle}
                className="media-poster-thumb"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="media-poster-placeholder">🎬</div>
            )}

            <div className="media-details">
              <span className="media-title" title={displayTitle}>
                {displayTitle}
              </span>

              <div className="media-meta-tags">
                <span className="meta-tag highlight">{mediaTypeLabel}</span>
                {selectedItem?.releaseYear && (
                  <span className="meta-tag">{selectedItem.releaseYear}</span>
                )}
                {candidate.episodeNumber !== null && (
                  <span className="meta-tag">Ep {candidate.episodeNumber}</span>
                )}
                {selectedItem && (
                  <span className="meta-tag">{selectedItem.provider.toUpperCase()}</span>
                )}
                <span className="meta-tag">{candidate.sourceDomain}</span>
              </div>

              {inLibrary && (
                <div className="library-status-pill">
                  <span>✓ In Library {libraryStatusText ? `(${libraryStatusText})` : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* If generic candidate, show matching catalog candidates for easy switching */}
          {!isMiruro && resolvedItems.length > 0 && (
            <div className="candidate-section">
              <div className="candidate-section-header">
                <span className="candidate-section-title">
                  {resolvedItems.length > 1
                    ? 'Matching titles (click to select):'
                    : 'Matched catalog title:'}
                </span>
                <span className="candidate-count-pill">{resolvedItems.length} found</span>
              </div>
              <div className="candidate-list">
                {resolvedItems.map((item) => {
                  const isSelected =
                    selectedItem?.provider === item.provider &&
                    selectedItem?.externalId === item.externalId;
                  return (
                    <div
                      key={`${item.provider}:${item.externalId}`}
                      className={`candidate-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedItem(item);
                        setStatusMessage(null);
                      }}
                    >
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="candidate-thumb"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="candidate-thumb-placeholder">🎬</div>
                      )}
                      <div className="candidate-info">
                        <span className="candidate-item-title" title={item.title}>
                          {item.title}
                        </span>
                        <div className="candidate-meta">
                          {item.releaseYear && <span>{item.releaseYear}</span>}
                          <span className="meta-tag">{item.provider.toUpperCase()}</span>
                          <span className="meta-tag">
                            {item.mediaType === 'movie' ? 'Movie' : 'Series'}
                          </span>
                          {item.inLibrary && (
                            <span className="library-mini-badge">✓ In Library</span>
                          )}
                        </div>
                      </div>
                      <div className="candidate-radio">
                        <span style={{ fontSize: '13px', color: isSelected ? '#FF5C35' : '#555' }}>
                          {isSelected ? '●' : '○'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Refine Search / Manual Query Input */}
          {!isMiruro && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setShowManualSearch((prev) => !prev)}
                >
                  {showManualSearch ? 'Hide search ▴' : 'Refine title search ▾'}
                </button>
              </div>

              {showManualSearch && (
                <div className="manual-search-box">
                  <div className="manual-search-row">
                    <input
                      type="text"
                      className="manual-search-input"
                      value={customSearchQuery}
                      onChange={(e) => setCustomSearchQuery(e.target.value)}
                      placeholder="Type title to search (e.g. One Piece)..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customSearchQuery.trim()) {
                          void resolveMedia(candidate, customSearchQuery.trim());
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-search-inline"
                      onClick={() => {
                        if (customSearchQuery.trim()) {
                          void resolveMedia(candidate, customSearchQuery.trim());
                        }
                      }}
                      disabled={resolving || !customSearchQuery.trim()}
                    >
                      {resolving ? '...' : 'Search'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alerts & Messages */}
          {actionSuccess && (
            <div className="notice-card" style={{ borderColor: 'rgba(93, 187, 138, 0.3)', color: '#5DBB8A' }}>
              {actionSuccess}
            </div>
          )}

          {statusMessage && (
            <div className="error-banner" role="alert">
              {statusMessage}
            </div>
          )}

          {/* Action Buttons: Immediately active once candidate is selected */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!inLibrary ? (
              <div className="actions-grid">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleAddToLibrary('watchlist')}
                  disabled={!isCandidateReady || isSubmitting || resolving}
                  title={!isCandidateReady ? 'Select a matching catalog title first' : 'Add to Watchlist'}
                >
                  {isSubmitting ? 'Saving...' : resolving ? 'Matching...' : '+ Watchlist'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    backgroundColor: '#222222',
                    color: '#F1F0EA',
                    border: '1px solid #333',
                    opacity: !isCandidateReady || isSubmitting || resolving ? 0.6 : 1,
                  }}
                  onClick={() => handleAddToLibrary('watching')}
                  disabled={!isCandidateReady || isSubmitting || resolving}
                  title={!isCandidateReady ? 'Select a matching catalog title first' : 'Start Watching & Tracking'}
                >
                  {isSubmitting ? 'Saving...' : resolving ? 'Matching...' : '▶ Start Watching'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => openDashboardEntry(selectedItem?.libraryEntryId)}
              >
                View in Dashboard
              </button>
            )}

            {/* Tracking Card: Active for either confirmed entries or auto-tracking session */}
            <TrackingCard
              libraryEntryId={selectedItem?.libraryEntryId || undefined}
              mediaId={selectedItem?.externalId || candidate.externalId || undefined}
              episodeNumber={candidate.episodeNumber}
              seasonNumber={candidate.seasonNumber}
              sourceName={candidate.sourceName}
              sourceDomain={candidate.sourceDomain}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={handleDismiss}
              >
                Not this
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={openDashboardDiscover}
              >
                Search on Vrate
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sub-component: Undetected / Idle State
  return (
    <div className="detection-section">
      <div className="detection-card">
        <div className="detection-header">
          <span className="detection-label">Media Detection</span>
        </div>

        <p style={{ fontSize: '12px', color: '#A3A3A3', lineHeight: '1.45' }}>
          No movies, series, or anime recognized on this page.
        </p>

        {statusMessage && (
          <div className="error-banner" role="alert">
            {statusMessage}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleManualDetect}
            disabled={detecting}
          >
            Detect on this page
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={openDashboardDiscover}
          >
            Search manually on Vrate
          </button>
        </div>
      </div>
    </div>
  );
}
