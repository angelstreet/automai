import { SiteHeader } from '@/components/layout/SiteHeader';

// Temporarily use direct imports instead of the indexed imports
// to help isolate any potential issues with the import path
import { Hero } from './(marketing)/_components/client/Hero';
import { Features } from './(marketing)/_components/client/Features';

// Debug component to help diagnose rendering issues
function DebugInfo() {
  return (
    <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md mb-4">
      <h2 className="font-bold">Debug Information</h2>
      <p>Page is rendering correctly at this point</p>
      <p>App Version: {process.env.NEXT_PUBLIC_APP_VERSION || 'development'}</p>
      <p>Node Environment: {process.env.NODE_ENV}</p>
      <p>Time: {new Date().toISOString()}</p>
      <p>Browser: {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'}</p>
    </div>
  );
}

export default function Page() {
  console.log('Rendering Page component');
  
  // Simple fallback version with minimal dependencies
  try {
    return (
      <div className="relative min-h-screen flex flex-col">
        <DebugInfo />
        
        <div className="p-4 bg-white rounded-md shadow-md mb-4">
          <h1 className="text-2xl font-bold">Welcome to Automai</h1>
          <p className="mt-2">
            Automate your infrastructure with AI. Deploy, monitor, and scale with confidence.
          </p>
        </div>
        
        {/* Try rendering the components one by one with error boundaries */}
        <div className="p-4">
          <h2 className="text-xl font-bold mb-2">Components:</h2>
          <div className="p-2 border border-gray-200 rounded-md mb-2">
            {(() => {
              try {
                return <SiteHeader />;
              } catch (e) {
                return <div className="text-red-500">Error rendering SiteHeader: {String(e)}</div>;
              }
            })()}
          </div>
          
          <div className="p-2 border border-gray-200 rounded-md mb-2">
            {(() => {
              try {
                return <Hero />;
              } catch (e) {
                return <div className="text-red-500">Error rendering Hero: {String(e)}</div>;
              }
            })()}
          </div>
          
          <div className="p-2 border border-gray-200 rounded-md mb-2">
            {(() => {
              try {
                return <Features />;
              } catch (e) {
                return <div className="text-red-500">Error rendering Features: {String(e)}</div>;
              }
            })()}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering Page component:', error);
    // Return a fallback UI
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-red-500">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p>We're having trouble loading this page. Please try again later.</p>
        <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto max-w-full">
          {error instanceof Error ? error.message : 'Unknown error'}
        </pre>
      </div>
    );
  }
}