import React from 'react';

export function TmdbNotConfiguredBanner() {
  return (
    <div className="rounded-card border border-brand-warning/30 bg-brand-warning/10 p-4 text-xs text-brand-warning">
      <div className="flex items-start gap-3">
        <svg
          className="h-5 w-5 shrink-0 text-brand-warning mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="space-y-1">
          <p className="font-semibold text-app-text">
            Movie & TV Show Catalog (TMDB) Not Configured
          </p>
          <p className="text-app-muted leading-relaxed">
            Anime search via <span className="font-medium text-app-text">AniList</span> remains fully functional.
            To enable movie and series discovery from TMDB, obtain an <span className="font-mono text-app-text">API Read Access Token</span> from your TMDB account settings, and add it to <span className="font-mono text-app-text">apps/web/.env.local</span>:
          </p>
          <div className="mt-2 rounded bg-app-bg/80 p-2 font-mono text-[11px] text-app-text border border-app-border">
            TMDB_API_READ_TOKEN=your_v4_read_access_token_here
          </div>
        </div>
      </div>
    </div>
  );
}
