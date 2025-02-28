'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

import { Button } from '@/components/Shadcn/button';
import { LanguageSwitcher } from '@/components/Shadcn/language-switcher';
import { ThemeToggle } from '@/components/Shadcn/theme-toggle';

interface HeaderProps {
  showAuth?: boolean;
}

export function SiteHeader({ showAuth = true }: HeaderProps) {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href={`/${locale}`} className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Automai</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href={`/${locale}/features`}
              className="transition-colors hover:text-foreground/80"
            >
              Features
            </Link>
            <Link
              href={`/${locale}/pricing`}
              className="transition-colors hover:text-foreground/80"
            >
              Pricing
            </Link>
            <Link href={`/${locale}/docs`} className="transition-colors hover:text-foreground/80">
              Documentation
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {showAuth && (
              <>
                <Button variant="ghost" asChild>
                  <Link href={`/${locale}/login`}>Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href={`/${locale}/signup`}>Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
