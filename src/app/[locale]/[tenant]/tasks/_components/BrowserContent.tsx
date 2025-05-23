import { TasksContentClient } from './client/TasksContentClient';

/**
 * Server component for task management
 * Handles server-side configuration and passes it to the client component
 */
export default async function TasksContent() {
  return <TasksContentClient />;
}
