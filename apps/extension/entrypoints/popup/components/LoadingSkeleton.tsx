import React from 'react';

export function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        className="skeleton-pulse"
        style={{ height: '56px', width: '100%', borderRadius: '8px' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          className="skeleton-pulse"
          style={{ height: '14px', width: '30%' }}
        />
        <div
          className="skeleton-pulse"
          style={{ height: '38px', width: '100%', borderRadius: '8px' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          className="skeleton-pulse"
          style={{ height: '14px', width: '40%' }}
        />
        <div
          className="skeleton-pulse"
          style={{ height: '38px', width: '100%', borderRadius: '8px' }}
        />
      </div>
      <div
        className="skeleton-pulse"
        style={{ height: '42px', width: '100%', borderRadius: '8px', marginTop: '4px' }}
      />
    </div>
  );
}
