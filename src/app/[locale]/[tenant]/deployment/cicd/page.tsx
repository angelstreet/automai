import { redirect } from 'next/navigation';

export default function CICDRedirect() {
  // Redirect to the new dedicated CICD page
  redirect('../cicd');
  
  // This won't be reached due to the redirect
  return null;
} 