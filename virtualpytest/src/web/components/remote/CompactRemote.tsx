import { RemotePanel } from './RemotePanel';
import { RemoteType, BaseConnectionConfig } from '../../types/features/Remote_Types';

interface CompactRemoteProps {
  /** The type of remote device */
  remoteType: RemoteType;
  /** Optional pre-configured connection parameters */
  connectionConfig?: BaseConnectionConfig;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Callback when disconnect is complete */
  onDisconnectComplete?: () => void;
  /** Custom styling */
  sx?: any;
}

export function CompactRemote({
  remoteType,
  connectionConfig,
  autoConnect = false,
  showScreenshot = false,
  onDisconnectComplete,
  sx = {}
}: CompactRemoteProps) {
  // Use RemotePanel with compact settings
  return (
    <RemotePanel
      remoteType={remoteType}
      connectionConfig={connectionConfig}
      autoConnect={autoConnect}
      showScreenshot={showScreenshot}
      onDisconnectComplete={onDisconnectComplete}
      sx={sx}
    />
  );
} 