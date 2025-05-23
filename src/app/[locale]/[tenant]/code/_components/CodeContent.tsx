import { CodeContentClient } from './client/CodeContentClient';

/**
 * Server component for fetching host data
 * Fetches initial host data and passes it to the client component
 */
export default async function CodeContent() {
  return <CodeContentClient />;
}
