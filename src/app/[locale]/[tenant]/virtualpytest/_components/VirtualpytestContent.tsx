'use client';

import { useState, useEffect } from 'react';
import { getTranslations } from 'next-intl/server';

interface VirtualPyTestContentProps {
  pageMetadata?: any;
}

export default function VirtualPyTestContent({ pageMetadata }: VirtualPyTestContentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [serverStatus, setServerStatus] = useState({
    api: false,
    frontend: false
  });

  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      // Check API server
      const apiResponse = await fetch('http://localhost:5009/api/health');
      const apiOk = apiResponse.ok;
      
      // Check frontend server
      const frontendResponse = await fetch('http://localhost:5173');
      const frontendOk = frontendResponse.ok;
      
      setServerStatus({
        api: apiOk,
        frontend: frontendOk
      });
      
      if (apiOk && frontendOk) {
        setIsLoading(false);
        setIsError(false);
      } else {
        setIsError(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[@component:VirtualPyTestContent] Server check failed:', error);
      setIsError(true);
      setIsLoading(false);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsError(true);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading VirtualPyTest</h3>
          <p className="text-sm text-gray-500">Connecting to test automation framework...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full">
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            VirtualPyTest Framework - Connection Error
          </h2>
          <p className="text-red-700 text-sm mb-4">
            Unable to connect to the VirtualPyTest servers. Please ensure both servers are running.
          </p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${serverStatus.api ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">API Server (Port 5009): {serverStatus.api ? 'Online' : 'Offline'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${serverStatus.frontend ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Frontend Server (Port 5173): {serverStatus.frontend ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          
          <button 
            onClick={checkServerStatus}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Setup Instructions</h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold mb-2">1. Start the Flask API Server:</h4>
              <code className="bg-gray-100 px-3 py-2 rounded block">
                cd automai/virtualpytest/src/web && python3 app.py
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Start the React Frontend:</h4>
              <code className="bg-gray-100 px-3 py-2 rounded block">
                cd automai/virtualpytest/src/web && npm run dev
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3. Verify servers are running:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>API: <a href="http://localhost:5009/api/health" target="_blank" className="text-blue-600 hover:underline">http://localhost:5009/api/health</a></li>
                <li>Frontend: <a href="http://localhost:5173" target="_blank" className="text-blue-600 hover:underline">http://localhost:5173</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-lg font-semibold text-green-800 mb-2">
          VirtualPyTest Framework
        </h2>
        <p className="text-green-700 text-sm">
          Comprehensive test automation framework with device management and execution engine.
        </p>
        <div className="flex items-center space-x-4 mt-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-green-600">API Connected</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-green-600">Frontend Connected</span>
          </div>
        </div>
      </div>
      
      <div className="w-full border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
        <iframe
          src="http://localhost:5173"
          className="w-full h-[calc(100vh-250px)] border-0"
          title="VirtualPyTest Interface"
          allow="fullscreen"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>
      
      <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
        <span>VirtualPyTest v1.0.0 - Integrated via iframe</span>
        <button 
          onClick={checkServerStatus}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          Check Status
        </button>
      </div>
    </div>
  );
}
