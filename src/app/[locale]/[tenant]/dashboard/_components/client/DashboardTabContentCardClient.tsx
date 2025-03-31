'use client';

import { DashboardTabContentCard } from '../DashboardTabContentCard';

export interface DashboardTabContentCardClientProps {
  title: string;
  description?: string;
}

export function DashboardTabContentCardClient({
  title,
  description,
}: DashboardTabContentCardClientProps) {
  return <DashboardTabContentCard title={title} description={description} />;
}
