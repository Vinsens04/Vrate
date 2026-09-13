import React, { useState } from 'react';
import { sendExtensionMessage } from '../../../src/auth/messages';
import type { SafeUser, UserProfile } from '../../../src/auth/schemas';
import { MediaDetectionCard } from './MediaDetectionCard';

interface ConnectedAccountProps {
  user: SafeUser;
  profile: UserProfile | null;
  onSignOut: () => Promise<void>;
  isSigningOut: boolean;
}

export function ConnectedAccount({
  user,
  profile,
  onSignOut,
  isSigningOut,
}: ConnectedAccountProps) {
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);

  const displayName = profile?.displayName || user.displayName || 'Vrate User';
  const email = user.email || 'Vrate Account';
  const avatarUrl = profile?.avatarUrl || user.avatarUrl;

  const initial = (displayName.charAt(0) || email.charAt(0) || 'V').toUpperCase();

  const handleOpenDashboard = async () => {
    setIsOpeningDashboard(true);
    try {
      await sendExtensionMessage({ type: 'OPEN_DASHBOARD' });
    } finally {
      setIsOpeningDashboard(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Profile Card */}
      <div className="profile-card">
        <div className="avatar-circle">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="avatar-img"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="user-meta">
          <span className="user-name" title={displayName}>
            {displayName}
          </span>
          <span className="user-email" title={email}>
            {email}
          </span>
        </div>
      </div>

      {/* Active Page Media Detection */}
      <MediaDetectionCard />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenDashboard}
          disabled={isOpeningDashboard || isSigningOut}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          {isOpeningDashboard ? 'Opening...' : 'Open Dashboard'}
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onSignOut}
          disabled={isSigningOut || isOpeningDashboard}
        >
          {isSigningOut ? 'Signing out...' : 'Sign out of Extension'}
        </button>
      </div>
    </div>
  );
}
