'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { cn } from '@/lib/utils';

interface SidebarLogoProps {
  collapsed?: boolean;
  className?: string;
}

export default function SidebarLogo({ collapsed = false, className }: SidebarLogoProps) {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const tenant = (params.tenant as string) || 'app';

  const homeUrl = `/${locale}/${tenant}`;

  return (
    <Link
      href={homeUrl}
      className={cn(
        'flex items-center justify-center h-10 px-4',
        collapsed ? 'w-10' : 'w-full',
        className,
      )}
    >
      {collapsed ? (
        <Image src="/logo-icon.svg" alt="Logo" width={24} height={24} className="transition-all" />
      ) : (
        <Image src="/logo.svg" alt="Logo" width={120} height={32} className="transition-all" />
      )}
    </Link>
  );
}
