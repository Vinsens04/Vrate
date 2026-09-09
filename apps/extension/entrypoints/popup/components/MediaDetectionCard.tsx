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
  toggleMiruroPermission,
  setAutoTrackingEnabled,
  triggerManualDetection,
} from '../../../src/detection/client';
import { sendExtensionMessage } from '../../../src/auth/messages';
import { TrackingCard } from './TrackingCard';
import { startActiveTabTracking } from '../../../src/tracking/client';

export function MediaDetectionCard() {
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [candidate, setCandidate] = useState<DetectedMediaCandidate | null>(null);
  const [resolvedItems, setResolvedItems] = useState<ResolvedMediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ResolvedMediaItem | null>(null);
  const [isMiruroPage, setIsMiruroPage] = useState(false);
  const [autoPermGranted, setAutoPermGranted] = useState(false);
  const [autoTrackEnabled, setAutoTrackEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize and load current tab detection
  useEffect(() => {
    let mounted = true;

    async function loadState() {
      setLoading(true);
      try {
        const state = await getCurrentDetectionState();
        if (!mounted) return;

        setIsMiruroPage(Boolean(state.isMiruroPage));
        setAutoPermGranted(Boolean(state.autoPermissionGranted));
        setAutoTrackEnabled(state.autoTrackEnabled !== false);

        if (state.candidate) {
          setCandidate(state.candidate);
          // Automatically trigger catalog resolution
          void resolveMedia(state.candidate);
        } else {
          setCandidate(null);
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

  async function resolveMedia(cand: DetectedMediaCandidate) {
    setStatusMessage(null);
    try {
      const res = await resolveCandidateMedia(cand);
      if (res && res.success) {
        setResolvedItems(res.candidates);
        if (res.candidates.length > 0) {
          setSelectedItem(res.candidates[0] ?? null);
        } else if (res.message) {
          setStatusMessage(res.message);
        }
      } else if (res?.error) {
        setStatusMessage(res.error);
      }
    } catch {
      setStatusMessage('Gagal menghubungi katalog Vrate.');
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
        await resolveMedia(res.candidate);
      } else {
        setCandidate(null);
        setResolvedItems([]);
        setSelectedItem(null);
      }
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Deteksi gagal dijalankan.');
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
      setStatusMessage('Pilih salah satu hasil katalog yang sesuai terlebih dahulu.');
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
            ? 'Berhasil ditambahkan ke Watchlist!'
            : 'Berhasil ditambahkan ke Sedang Ditonton!'
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
        setStatusMessage(res.error || res.message || 'Gagal menambahkan ke library.');
      }
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleAutoTrack() {
    try {
      if (!autoPermGranted) {
        const granted = await toggleMiruroPermission(false);
        setAutoPermGranted(granted);
        if (granted) {
          await setAutoTrackingEnabled(true);
          setAutoTrackEnabled(true);
        }
      } else {
        const next = !autoTrackEnabled;
        await setAutoTrackingEnabled(next);
        setAutoTrackEnabled(next);
      }
    } catch {
      // Permission prompt declined by user
    }
  }

  const renderAutoTrackBox = () => {
    const isFullyActive = autoPermGranted && autoTrackEnabled;

    return (
      <div className="auto-detect-box" style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: '#F1F0EA', fontSize: '11px' }}>
            Auto Tracking Miruro {isMiruroPage ? '(Tab Miruro)' : ''}
          </span>
          <span
            className="meta-tag"
            style={{ color: isFullyActive ? '#5DBB8A' : '#A3A3A3' }}
          >
            {isFullyActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>

        <p style={{ color: '#888888', lineHeight: '1.4', fontSize: '11px', marginTop: '4px' }}>
          {isFullyActive
            ? 'Ekstensi otomatis mendeteksi episode, melacak pemutaran, dan menyimpan ke library setelah 30 detik pemutaran nyata.'
            : !autoPermGranted
            ? 'Berikan izin host untuk miruro.bz dan player iframe agar tracking otomatis dapat berjalan tanpa konfirmasi.'
            : 'Fitur tracking otomatis dinonaktifkan sementara.'}
        </p>

        <button
          type="button"
          className="btn-secondary"
          onClick={handleToggleAutoTrack}
          style={{ fontSize: '11px', minHeight: '30px', marginTop: '6px', width: '100%' }}
        >
          {isFullyActive
            ? 'Nonaktifkan Auto Tracking'
            : !autoPermGranted
            ? 'Aktifkan Izin & Auto Tracking'
            : 'Aktifkan Auto Tracking'}
        </button>
      </div>
    );
  };

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
          <span className="detection-label">Deteksi Halaman</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0' }}>
          <div className="status-dot" style={{ backgroundColor: '#FF5C35', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: '12px', color: '#A3A3A3' }}>Memeriksa halaman…</span>
        </div>
      </div>
    );
  }

  // Sub-component: Active Candidate Detected
  if (candidate) {
    const isMiruro = candidate.sourceName === 'miruro';
    const confidenceLabel =
      candidate.confidence >= 0.8
        ? 'Cocok kuat'
        : candidate.confidence >= 0.5
        ? 'Kemungkinan cocok'
        : 'Perlu dikonfirmasi';

    const confidenceClass =
      candidate.confidence >= 0.8
        ? 'confidence-high'
        : candidate.confidence >= 0.5
        ? 'confidence-medium'
        : 'confidence-low';

    const displayTitle = selectedItem ? selectedItem.title : candidate.titleHint;
    const displayPoster = selectedItem?.posterUrl;
    const mediaTypeLabel = selectedItem
      ? selectedItem.mediaType === 'movie'
        ? 'Film'
        : 'Serial'
      : isMiruro
      ? 'Anime'
      : 'Media';

    const inLibrary = Boolean(selectedItem?.inLibrary);
    const libraryStatusText =
      selectedItem?.libraryStatus === 'watching'
        ? 'Sedang Ditonton'
        : selectedItem?.libraryStatus === 'watchlist'
        ? 'Watchlist'
        : selectedItem?.libraryStatus === 'completed'
        ? 'Selesai'
        : selectedItem?.libraryStatus;

    return (
      <div className="detection-section">
        <div className="detection-card">
          <div className="detection-header">
            <span className="detection-label">
              {isMiruro ? 'Terdeteksi dari AniList ID' : 'Media Terdeteksi'}
            </span>
            <span className={`confidence-pill ${confidenceClass}`}>
              {confidenceLabel}
            </span>
          </div>

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
                {candidate.episodeNumber !== null && (
                  <span className="meta-tag">Ep {candidate.episodeNumber}</span>
                )}
                <span className="meta-tag">{candidate.sourceDomain}</span>
              </div>

              {inLibrary && (
                <div className="library-status-pill">
                  <span>✓ Sudah di Library {libraryStatusText ? `(${libraryStatusText})` : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* If generic candidate, show up to 5 matching catalog candidates */}
          {!isMiruro && resolvedItems.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#A3A3A3', fontWeight: 600 }}>
                Pilih media yang sesuai:
              </span>
              <div className="candidate-list">
                {resolvedItems.map((item) => {
                  const isSelected = selectedItem?.externalId === item.externalId;
                  return (
                    <div
                      key={`${item.provider}:${item.externalId}`}
                      className={`candidate-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: isSelected ? '#FF5C35' : '#888' }}>
                          {isSelected ? '●' : '○'}
                        </span>
                        <span className="candidate-item-title">{item.title}</span>
                      </div>
                      <span className="meta-tag">{item.provider.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
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

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!inLibrary ? (
              <div className="actions-grid">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleAddToLibrary('watchlist')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : '+ Watchlist'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ backgroundColor: '#222222', color: '#F1F0EA', border: '1px solid #333' }}
                  onClick={() => handleAddToLibrary('watching')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : '▶ Mulai Menonton'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => openDashboardEntry(selectedItem?.libraryEntryId)}
              >
                Lihat di Dashboard
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
                Bukan Ini
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={openDashboardDiscover}
              >
                Cari di Vrate
              </button>
            </div>

            {renderAutoTrackBox()}
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
          <span className="detection-label">Deteksi Media</span>
        </div>

        <p style={{ fontSize: '12px', color: '#A3A3A3', lineHeight: '1.45' }}>
          Tidak ada film, serial, atau anime yang dapat dikenali pada halaman ini.
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
            Deteksi Halaman Ini
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={openDashboardDiscover}
          >
            Cari manual di Vrate
          </button>
        </div>
      </div>

      {/* Auto-Tracking settings for Miruro */}
      {renderAutoTrackBox()}
    </div>
  );
}
