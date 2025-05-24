import { ThirdPartyContentClient } from './client/ThirdPartyContentClient';

/**
 * Server component for third party tools management
 * Handles server-side configuration and passes it to the client component
 */
export default async function ThirdPartyContent() {
  return <ThirdPartyContentClient />;
}
