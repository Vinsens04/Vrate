import React from 'react';
import type { LibraryStatus } from '@vrate/shared';
import { formatStatusBadgeStyle, formatStatusLabel } from '../utils/library-logic';

interface StatusBadgeProps {
  status: LibraryStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const style = formatStatusBadgeStyle(status);
  const label = formatStatusLabel(status);

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center border font-medium ${style.bg} ${style.border} ${style.text} ${sizeClasses} ${className}`}
      role="status"
    >
      {label}
    </span>
  );
}

