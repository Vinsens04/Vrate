import React from 'react';

interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorNotice({
  message,
  onRetry,
  retryLabel = 'Coba Lagi',
}: ErrorNoticeProps) {
  return (
    <div className="error-banner" role="alert">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span>{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              background: 'none',
              border: 'none',
              color: '#FF5C35',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
              textDecoration: 'underline',
              padding: '0',
              whiteSpace: 'nowrap',
            }}
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
