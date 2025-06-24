import { Server, Rocket, Code } from 'lucide-react';

import { Badge } from '@/components/shadcn/badge';
import { Card, CardContent } from '@/components/shadcn/card';

interface ResourceProps {
  type: string;
  name: string;
  id?: string;
  status?: string;
  count?: number;
  url?: string;
}

export function ResourceCard({ resource }: { resource: ResourceProps }) {
  const getIcon = () => {
    switch (resource.type.toLowerCase()) {
      case 'repository':
        return <Code className="h-5 w-5" />;
      case 'host':
        return <Server className="h-5 w-5" />;
      case 'deployment':
        return <Rocket className="h-5 w-5" />;
      default:
        return <Code className="h-5 w-5" />;
    }
  };

  const getStatusColor = () => {
    if (!resource.status) return '';

    switch (resource.status.toLowerCase()) {
      case 'online':
      case 'active':
      case 'deployed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'offline':
      case 'inactive':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'maintenance':
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 text-center">
        <div className="flex items-center gap-2 mb-4 justify-center">
          {getIcon()}
          <h3 className="font-semibold">{resource.name}</h3>
        </div>

        <div className="space-y-2">
          {resource.id && (
            <p className="text-sm text-muted-foreground truncate" title={resource.id}>
              ID: {resource.id.length > 10 ? `${resource.id.substring(0, 10)}...` : resource.id}
            </p>
          )}

          {resource.url && (
            <p className="text-sm truncate">
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {resource.url.replace(/^https?:\/\//, '')}
              </a>
            </p>
          )}

          {resource.status && (
            <Badge className={getStatusColor()} variant="outline">
              {resource.status}
            </Badge>
          )}

          {typeof resource.count === 'number' && (
            <p className="text-lg font-bold">{resource.count}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
