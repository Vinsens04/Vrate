import React from 'react';
import type { Metadata } from 'next';
import { CreditsView } from '@/features/catalog/components/CreditsView';

export const metadata: Metadata = {
  title: 'Attribution & Metadata Credits | Vrate',
  description: 'Official attribution information for TMDB and AniList as Vrate metadata providers.',
};

export default function CreditsPage() {
  return <CreditsView />;
}
