'use client';

import { Bot, Code, Gauge, GitPullRequest, Shield, Zap } from 'lucide-react';

const features = [
  {
    name: 'AI-Powered Testing',
    description:
      'Leverage artificial intelligence to automatically generate and maintain test cases.',
    icon: Bot,
  },
  {
    name: 'Fast Execution',
    description: 'Run tests in parallel with optimized performance for quick feedback.',
    icon: Zap,
  },
  {
    name: 'Code Integration',
    description: 'Seamlessly integrate with your existing codebase and CI/CD pipeline.',
    icon: Code,
  },
  {
    name: 'Security First',
    description: 'Enterprise-grade security with role-based access control.',
    icon: Shield,
  },
  {
    name: 'Performance Metrics',
    description: 'Detailed analytics and insights into your testing process.',
    icon: Gauge,
  },
  {
    name: 'Version Control',
    description: 'Built-in version control for test cases and configurations.',
    icon: GitPullRequest,
  },
];

export function Features() {
  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Powerful Features</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to automate testing
          </p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Our platform provides comprehensive tools for automating your testing workflow, from
            test case generation to execution and reporting.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7">
                  <feature.icon className="h-5 w-5 flex-none text-primary" aria-hidden="true" />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
