import React from 'react';

function PosterSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-[2/3] border border-app-border bg-app-surface" />
      <div className="h-3 w-2/3 bg-app-elevated" />
      <div className="h-3 w-1/2 bg-app-elevated/70" />
    </div>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="border-b border-app-border pb-10">
        <div className="h-3 w-20 bg-app-elevated" />
        <div className="mt-5 h-16 w-52 bg-app-elevated" />
        <div className="mt-5 h-4 w-full max-w-lg bg-app-elevated/70" />
        <div className="mt-9 grid border-y border-app-border sm:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-app-border py-4 sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0">
              <div className="h-3 w-24 bg-app-elevated/70" />
              <div className="mt-3 h-8 w-12 bg-app-elevated" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => <PosterSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function LibraryGridSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="border-b border-app-border pb-7">
        <div className="h-3 w-20 bg-app-elevated" />
        <div className="mt-4 h-12 w-40 bg-app-elevated" />
        <div className="mt-4 h-4 w-full max-w-xl bg-app-elevated/70" />
      </div>

      <div className="space-y-5">
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => <div key={i} className="h-9 w-20 bg-app-elevated" />)}
        </div>
        <div className="flex flex-col gap-3 border-y border-app-border py-4 sm:flex-row sm:justify-between">
          <div className="h-11 w-full max-w-80 bg-app-elevated" />
          <div className="h-11 w-56 bg-app-elevated" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {[...Array(12)].map((_, i) => <PosterSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function LibraryDetailSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="h-4 w-72 bg-app-elevated" />
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="aspect-[2/3] border border-app-border bg-app-surface" />
          <div className="space-y-3 border-y border-app-border py-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-app-elevated" />)}
          </div>
        </div>
        <div className="space-y-8">
          <div className="border-b border-app-border pb-8">
            <div className="h-3 w-32 bg-app-elevated" />
            <div className="mt-4 h-14 w-3/4 bg-app-elevated" />
          </div>
          <div className="h-28 max-w-3xl bg-app-elevated/70" />
          <div className="grid gap-5 border-y border-app-border py-6 sm:grid-cols-2">
            <div className="h-12 bg-app-elevated" />
            <div className="h-12 bg-app-elevated" />
          </div>
        </div>
      </div>
    </div>
  );
}

