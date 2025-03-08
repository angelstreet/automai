'use client';

import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function TenantProjectsPage() {
  const params = useParams();
  const locale = params.locale as string;
  
  // Redirect to the projects page outside the tenant layout
  redirect(`/${locale}/projects`);
} 