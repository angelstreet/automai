import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="rounded-full bg-gray-800 dark:bg-gray-700 p-6 mb-6">
          <div className="text-white">{icon}</div>
        </div>
      )}
      <h3 className="text-xl font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
