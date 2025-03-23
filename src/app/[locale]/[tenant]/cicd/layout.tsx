import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CI/CD Integration',
  description: 'Configure CI/CD providers for automated deployments',
};

export default function CICDLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 