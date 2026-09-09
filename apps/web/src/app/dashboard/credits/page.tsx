import React from 'react';
import type { Metadata } from 'next';
import { CreditsView } from '@/features/catalog/components/CreditsView';

export const metadata: Metadata = {
  title: 'Atribusi & Kredit Metadata | Vrate',
  description: 'Informasi atribusi resmi TMDB dan AniList sebagai penyedia metadata media Vrate.',
};

export default function CreditsPage() {
  return <CreditsView />;
}
