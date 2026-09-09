import React from 'react';
import type { ExtensionAuthState } from '../../../src/auth/schemas';

interface HeaderProps {
  state: ExtensionAuthState;
}

export function Header({ state }: HeaderProps) {
  let badgeClass = 'status-badge unconnected';
  let badgeLabel = 'Belum Masuk';

  if (state === 'signed_in') {
    badgeClass = 'status-badge connected';
    badgeLabel = 'Terhubung';
  } else if (state === 'loading') {
    badgeClass = 'status-badge';
    badgeLabel = 'Memeriksa...';
  } else if (state === 'offline') {
    badgeClass = 'status-badge';
    badgeLabel = 'Offline';
  } else if (state === 'expired') {
    badgeClass = 'status-badge unconnected';
    badgeLabel = 'Sesi Berakhir';
  } else if (state === 'unconfigured') {
    badgeClass = 'status-badge unconnected';
    badgeLabel = 'Konfigurasi';
  }

  return (
    <header className="header-row">
      <div className="brand-logo">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="brand-icon"
          aria-hidden="true"
        >
          <path
            d="M4 4.5L10.2 19.5L20 6.2"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon points="11.5,8.2 17.1,11.9 11.5,15.6" fill="currentColor" opacity="0.9" />
        </svg>
        <span className="brand-title">Vrate</span>
      </div>

      <div className={badgeClass} role="status">
        <span className="status-dot" aria-hidden="true" />
        <span>{badgeLabel}</span>
      </div>
    </header>
  );
}
