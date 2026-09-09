import React from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  isLink?: boolean;
  href?: string;
  className?: string;
}

export function Logo({
  size = 'md',
  showWordmark = true,
  isLink = true,
  href = '/',
  className = '',
}: LogoProps) {
  const iconDimensions = {
    sm: 'h-6 w-6',
    md: 'h-7 w-7',
    lg: 'h-8 w-8',
  }[size];

  const wordmarkSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`relative flex items-center justify-center text-brand-primary ${iconDimensions}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
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
      </div>

      {showWordmark && (
        <span className={`font-semibold text-app-text transition ${wordmarkSizes}`}>
          Vrate
        </span>
      )}
    </div>
  );

  if (isLink) {
    return (
      <Link
        href={href}
        className="inline-flex items-center rounded-btn focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        aria-label="Beranda Vrate"
      >
        {content}
      </Link>
    );
  }

  return content;
}

