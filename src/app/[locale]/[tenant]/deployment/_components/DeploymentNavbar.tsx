import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { deploymentNavItems } from '@/components/sidebar/DeploymentNav';

export const DeploymentNavbar: React.FC = () => {
  const pathname = usePathname();

  // Parse the current locale and tenant from the pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const locale = pathSegments[0] || 'en';
  const tenant = pathSegments[1] || '';

  // Create full paths with locale and tenant
  const getFullPath = (path: string) => {
    return `/${locale}/${tenant}${path}`;
  };

  // Check if the current path matches a nav item
  const isActive = (path: string) => {
    const fullPath = getFullPath(path);

    if (path === '/deployment') {
      // For the main deployment path, only match exactly to avoid matching subpaths
      return pathname === fullPath;
    }

    // For other paths, check if the pathname starts with the fullPath
    return pathname.startsWith(fullPath);
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav className="-mb-px flex space-x-8">
        {deploymentNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={getFullPath(item.href)}
              className={`
                flex items-center py-4 px-1 text-sm font-medium border-b-2 transition-colors
                ${
                  isActive(item.href)
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <Icon className="h-4 w-4 mr-2" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
