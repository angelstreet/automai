'use client';

import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Play } from 'lucide-react';
import { usePermission } from '@/context/PermissionContext';
import { PermissionGuard } from '@/components/ui/PermissionGuard';
import { Host } from '@/types/host';

interface HostActionButtonsProps {
  host?: Host;
  onCreateHost?: () => void;
  onEditHost?: (host: Host) => void;
  onDeleteHost?: (host: Host) => void;
  onTestConnection?: (host: Host) => void;
}

export function HostActionButtons({
  host,
  onCreateHost,
  onEditHost,
  onDeleteHost,
  onTestConnection,
}: HostActionButtonsProps) {
  const { hasPermission, loading } = usePermission();

  // If permissions are loading, show loading state
  if (loading) {
    return <div className="flex gap-2 animate-pulse h-10 bg-gray-100 rounded w-28"></div>;
  }

  return (
    <div className="flex gap-2">
      {/* Create host button - only show if user has insert permission */}
      {!host && (
        <PermissionGuard resourceType="hosts" operation="insert">
          <Button onClick={onCreateHost} size="sm" className="flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Add Host
          </Button>
        </PermissionGuard>
      )}

      {/* Edit host button - check update permission or update_own permission */}
      {host && (
        <PermissionGuard resourceType="hosts" operation="update" creatorId={host.creator_id}>
          <Button
            onClick={() => onEditHost?.(host)}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </PermissionGuard>
      )}

      {/* Delete host button - check delete permission or delete_own permission */}
      {host && (
        <PermissionGuard resourceType="hosts" operation="delete" creatorId={host.creator_id}>
          <Button
            onClick={() => onDeleteHost?.(host)}
            size="sm"
            variant="destructive"
            className="flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </PermissionGuard>
      )}

      {/* Test connection button - check execute permission */}
      {host && (
        <PermissionGuard resourceType="hosts" operation="execute">
          <Button
            onClick={() => onTestConnection?.(host)}
            size="sm"
            variant="secondary"
            className="flex items-center gap-1"
          >
            <Play className="w-4 h-4" />
            Test Connection
          </Button>
        </PermissionGuard>
      )}
    </div>
  );
}

/**
 * Example usage:
 *
 * ```tsx
 * // In a page component
 * import { HostActionButtons } from './_components/HostActions';
 *
 * export default function HostsPage() {
 *   const [hosts, setHosts] = useState<Host[]>([]);
 *
 *   // Handlers
 *   const handleCreateHost = () => { ... };
 *   const handleEditHost = (host: Host) => { ... };
 *   const handleDeleteHost = (host: Host) => { ... };
 *   const handleTestConnection = (host: Host) => { ... };
 *
 *   return (
 *     <div>
 *       <div className="flex justify-between items-center">
 *         <h1>Hosts</h1>
 *         <HostActionButtons onCreateHost={handleCreateHost} />
 *       </div>
 *
 *       {hosts.map(host => (
 *         <div key={host.id} className="flex justify-between items-center">
 *           <div>{host.name}</div>
 *           <HostActionButtons
 *             host={host}
 *             onEditHost={handleEditHost}
 *             onDeleteHost={handleDeleteHost}
 *             onTestConnection={handleTestConnection}
 *           />
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
