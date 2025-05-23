import { IssuesContentClient } from './client/IssuesContentClient';

/**
 * Server component for fetching host data
 * Fetches initial host data and passes it to the client component
 */
export default async function IssuesContent() {
  return <IssuesContentClient />;
}
