'use client';

import Link from 'next/link';

import { Github, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-semibold">Product</h3>
            <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Documentation
            </Link>
          </div>
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-semibold">Company</h3>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
              Blog
            </Link>
            <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground">
              Careers
            </Link>
          </div>
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-semibold">Legal</h3>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
          </div>
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-semibold">Connect</h3>
            <div className="flex space-x-4">
              <Link
                href="https://twitter.com"
                className="text-muted-foreground hover:text-foreground"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://github.com"
                className="text-muted-foreground hover:text-foreground"
              >
                <Github className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center space-x-2">
              <span className="font-bold">Automai</span>
              <span className="text-sm text-muted-foreground">Automate your testing workflow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Automai. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
