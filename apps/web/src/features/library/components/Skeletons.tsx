import React from 'react';

function PosterSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-[2/3] rounded-xl border border-app-border/70 bg-app-surface" />
      <div className="h-3 w-3/4 rounded bg-app-elevated" />
      <div className="h-3 w-1/2 rounded bg-app-elevated/60" />
    </div>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      {/* Hero Skeleton */}
      <div className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-8">
        <div className="h-3 w-28 rounded-full bg-app-elevated" />
        <div className="mt-5 h-12 w-64 rounded-xl bg-app-elevated" />
        <div className="mt-3 h-4 max-w-md rounded bg-app-elevated/60" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-app-border/60 bg-app-elevated/50 p-4" />
          ))}
        </div>
      </div>

      {/* Continue Watching Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-app-elevated" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <PosterSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Recently Added Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-app-elevated" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <PosterSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LibraryGridSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-8">
        <div className="h-3 w-24 rounded-full bg-app-elevated" />
        <div className="mt-4 h-10 w-44 rounded-xl bg-app-elevated" />
        <div className="mt-2 h-4 max-w-lg rounded bg-app-elevated/60" />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-lg bg-app-elevated" />
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-app-border/70 bg-app-surface/40 p-3.5 sm:flex-row sm:justify-between">
          <div className="h-10 w-full rounded-input bg-app-elevated sm:w-80" />
          <div className="h-10 w-52 rounded-input bg-app-elevated" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {[...Array(12)].map((_, i) => (
          <PosterSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function LibraryDetailSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="h-6 w-64 rounded-full bg-app-elevated" />
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="aspect-[2/3] rounded-2xl border border-app-border/70 bg-app-surface" />
          <div className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-app-elevated" />
            ))}
          </div>
        </div>
        <div className="space-y-8">
          <div className="rounded-2xl border border-app-border/70 bg-app-surface/60 p-8">
            <div className="h-4 w-32 rounded bg-app-elevated" />
            <div className="mt-4 h-12 w-3/4 rounded-xl bg-app-elevated" />
          </div>
          <div className="h-28 rounded-2xl border border-app-border/70 bg-app-surface/60 p-6" />
          <div className="h-36 rounded-2xl border border-app-border/70 bg-app-surface/60 p-6" />
        </div>
      </div>
    </div>
  );
}

