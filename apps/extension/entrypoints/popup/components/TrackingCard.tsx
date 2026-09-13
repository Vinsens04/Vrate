import React, { useEffect, useState } from 'react';
import {
  getActiveTabTrackingState,
  startActiveTabTracking,
  stopActiveTabTracking,
  markActiveTabEpisodeCompleted,
  deleteActiveTabEpisodeProgress,
  correctActiveTabEpisode,
  formatTrackingStatus,
  formatSecondsToTime,
} from '../../../src/tracking/client';
import type { TabTrackingSession } from '../../../src/tracking/tab-tracker-state';
import { AUTO_TRACK_CONFIRMATION_SECONDS } from '@vrate/shared';

interface TrackingCardProps {
  libraryEntryId?: string;
  mediaId?: string;
  episodeNumber?: number | null;
  seasonNumber?: number | null;
  sourceName?: string;
  sourceDomain?: string;
  sourceUrl?: string | null;
  onSessionChange?: (session: TabTrackingSession | null) => void;
}

export function TrackingCard({
  libraryEntryId,
  mediaId,
  episodeNumber,
  seasonNumber,
  sourceName,
  sourceDomain,
  sourceUrl,
  onSessionChange,
}: TrackingCardProps) {
  const [session, setSession] = useState<TabTrackingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showCorrectModal, setShowCorrectModal] = useState(false);
  const [correctedEpInput, setCorrectedEpInput] = useState('');

  // Poll active tab tracking state while popup is open
  useEffect(() => {
    let mounted = true;

    async function poll() {
      const state = await getActiveTabTrackingState();
      if (!mounted) return;
      setSession(state);
      onSessionChange?.(state);
    }

    void poll();
    const interval = setInterval(poll, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [onSessionChange]);

  const handleStartTracking = async () => {
    if (!libraryEntryId || !mediaId) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await startActiveTabTracking({
        libraryEntryId,
        mediaId,
        episodeNumber,
        seasonNumber,
        sourceName: sourceName || 'web',
        sourceDomain: sourceDomain || 'unknown',
        sourceUrl,
      });

      if (res.success && res.session) {
        setSession(res.session);
        onSessionChange?.(res.session);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start tracking.');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await stopActiveTabTracking();
      setSession(null);
      onSessionChange?.(null);
      setSuccessMsg('Tracking session stopped.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    const targetEntryId = session?.libraryEntryId || libraryEntryId;
    const targetEp = session?.episodeNumber ?? episodeNumber ?? 1;
    const targetSeason = session?.seasonNumber ?? seasonNumber ?? null;

    if (!targetEntryId) {
      setErrorMsg('Media is not in library yet.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await markActiveTabEpisodeCompleted({
        libraryEntryId: targetEntryId,
        episodeNumber: targetEp,
        seasonNumber: targetSeason,
      });

      if (res.success) {
        setSuccessMsg(`Episode ${targetEp} marked as completed!`);
        if (session) {
          setSession({ ...session, isCompleted: true });
        }
      } else {
        setErrorMsg(res.error || 'Failed to mark episode as completed.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to mark episode as completed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProgress = async () => {
    const targetEntryId = session?.libraryEntryId || libraryEntryId;
    const targetEp = session?.episodeNumber ?? episodeNumber ?? 1;
    const targetSeason = session?.seasonNumber ?? seasonNumber ?? null;

    if (!targetEntryId) {
      setErrorMsg('Media is not in library yet.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await deleteActiveTabEpisodeProgress({
        libraryEntryId: targetEntryId,
        episodeNumber: targetEp,
        seasonNumber: targetSeason,
      });

      if (res.success) {
        setSuccessMsg(`Episode ${targetEp} progress deleted successfully.`);
        if (session) {
          setSession({
            ...session,
            progressSeconds: 0,
            watchedSeconds: 0,
            accumulatedRealWatchedSeconds: 0,
            isCompleted: false,
          });
        }
      } else {
        setErrorMsg(res.error || 'Failed to delete progress.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete progress.');
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectEpisode = async () => {
    const targetEntryId = session?.libraryEntryId || libraryEntryId;
    const targetEp = session?.episodeNumber ?? episodeNumber ?? 1;
    const targetSeason = session?.seasonNumber ?? seasonNumber ?? null;
    const newEpNum = parseInt(correctedEpInput, 10);

    if (!newEpNum || isNaN(newEpNum) || newEpNum <= 0) {
      setErrorMsg('New episode number must be a positive number.');
      return;
    }

    if (!targetEntryId) {
      setErrorMsg('Media is not in library yet.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await correctActiveTabEpisode({
        libraryEntryId: targetEntryId,
        currentEpisodeNumber: targetEp,
        correctedEpisodeNumber: newEpNum,
        seasonNumber: targetSeason,
      });

      if (res.success) {
        setSuccessMsg(`Episode number updated to ${newEpNum}.`);
        setShowCorrectModal(false);
        setCorrectedEpInput('');
        if (session) {
          setSession({ ...session, episodeNumber: newEpNum });
        }
      } else {
        setErrorMsg(res.error || 'Failed to correct episode.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to correct episode.');
    } finally {
      setLoading(false);
    }
  };

  // If no active session and no library entry to start, render nothing
  if (!session && !libraryEntryId) {
    return null;
  }

  // If there's an active tracking session on this tab
  if (session) {
    const statusMeta = formatTrackingStatus(session.status);
    const progress = session.progressSeconds || 0;
    const duration = session.durationSeconds || null;
    const percent =
      duration && duration > 0 ? Math.min(100, Math.round((progress / duration) * 100)) : 0;
    const epDisplay =
      session.episodeNumber !== null
        ? session.seasonNumber !== null && session.seasonNumber > 1
          ? `S${session.seasonNumber}E${session.episodeNumber}`
          : `E${session.episodeNumber}`
        : null;

    const accumulatedWatched = Math.min(
      AUTO_TRACK_CONFIRMATION_SECONDS,
      Math.floor(session.accumulatedRealWatchedSeconds || 0)
    );

    return (
      <div
        className="tracking-card"
        style={{
          marginTop: '10px',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          border: '1px solid #282828',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: statusMeta.color,
                animation: session.status === 'tracking' ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: 600, color: statusMeta.color }}>
              {statusMeta.label}
            </span>
            {epDisplay && (
              <span
                className="meta-tag"
                style={{ backgroundColor: 'rgba(255, 92, 53, 0.15)', color: '#FF5C35' }}
              >
                {epDisplay}
              </span>
            )}
          </div>

          {session.isCompleted && (
            <span
              className="meta-tag"
              style={{ backgroundColor: 'rgba(93, 187, 138, 0.15)', color: '#5DBB8A' }}
            >
              ✓ Completed
            </span>
          )}
        </div>

        {/* 30-second confirmation status */}
        {!session.isPersistedToLibrary && (
          <div
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 92, 53, 0.08)',
              border: '1px solid rgba(255, 92, 53, 0.25)',
              fontSize: '11px',
              color: '#FFB4A2',
              lineHeight: '1.4',
              marginBottom: '8px',
            }}
          >
            Auto Confirmation: {accumulatedWatched}/{AUTO_TRACK_CONFIRMATION_SECONDS}s actual playback
          </div>
        )}

        {/* Unsupported iframe warning */}
        {session.status === 'unsupported_iframe' && (
          <div
            style={{
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(229, 115, 115, 0.1)',
              border: '1px solid rgba(229, 115, 115, 0.3)',
              fontSize: '11px',
              color: '#FFB4B4',
              lineHeight: '1.4',
              marginBottom: '8px',
            }}
          >
            Video player is inside an iframe from another domain ({session.iframeDomain || 'embed'}).
            Progress cannot be read directly due to browser security policies.
          </div>
        )}

        {/* Progress Display */}
        {duration && duration > 0 ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#A3A3A3',
                marginBottom: '4px',
              }}
            >
              <span>
                {formatSecondsToTime(progress)} / {formatSecondsToTime(duration)}
              </span>
              <span>{percent}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#333333',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  backgroundColor: session.isCompleted ? '#5DBB8A' : '#FF5C35',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#888888', marginBottom: '8px' }}>
            Position: {formatSecondsToTime(progress)}
          </div>
        )}

        {/* Messages */}
        {successMsg && (
          <div
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(93, 187, 138, 0.12)',
              border: '1px solid rgba(93, 187, 138, 0.3)',
              fontSize: '11px',
              color: '#5DBB8A',
              marginBottom: '8px',
            }}
          >
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="error-banner" role="alert" style={{ marginBottom: '8px' }}>
            {errorMsg}
          </div>
        )}

        {/* Correct Episode Form */}
        {showCorrectModal && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '8px',
              backgroundColor: '#1E1E1E',
              borderRadius: '6px',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#A3A3A3' }}>Correct episode number:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                min="1"
                value={correctedEpInput}
                onChange={(e) => setCorrectedEpInput(e.target.value)}
                placeholder="1"
                style={{
                  width: '70px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #333',
                  backgroundColor: '#121212',
                  color: '#FFF',
                  fontSize: '12px',
                }}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={handleCorrectEpisode}
                disabled={loading}
              >
                Save
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => setShowCorrectModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* User Action Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleMarkCompleted}
            disabled={loading || session.isCompleted}
            style={{ fontSize: '10px', padding: '6px' }}
          >
            ✓ Mark Completed
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowCorrectModal(!showCorrectModal)}
            disabled={loading}
            style={{ fontSize: '10px', padding: '6px' }}
          >
            ✎ Edit Ep
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleDeleteProgress}
            disabled={loading}
            style={{ fontSize: '10px', padding: '6px', color: '#FF8888' }}
          >
            🗑 Clear Progress
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleStopTracking}
            disabled={loading}
            style={{ fontSize: '10px', padding: '6px' }}
          >
            ⏹ Stop Session
          </button>
        </div>
      </div>
    );
  }

  // If media is in library but tracking hasn't started on this tab
  return (
    <div style={{ marginTop: '10px' }}>
      {errorMsg && (
        <div className="error-banner" role="alert" style={{ marginBottom: '8px' }}>
          {errorMsg}
        </div>
      )}
      <button
        type="button"
        className="btn-primary"
        style={{ width: '100%', backgroundColor: '#FF5C35', fontSize: '12px' }}
        onClick={handleStartTracking}
        disabled={loading}
      >
        {loading ? 'Preparing...' : '▶ Track Video Progress'}
      </button>
    </div>
  );
}
