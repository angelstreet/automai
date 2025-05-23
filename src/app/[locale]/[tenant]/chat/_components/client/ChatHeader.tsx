'use client';

import { AI_MODELS } from '../../constants';

/**
 * Chat header component - contains model selection and API token input
 */
export default function ChatHeader() {
  return (
    <div className="flex items-center justify-between px-6 py-3 h-full">
      {/* Model Selection */}
      <div className="flex items-center space-x-4">
        <label htmlFor="model-select" className="text-sm font-medium text-gray-700">
          Model:
        </label>
        <select
          id="model-select"
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          defaultValue={AI_MODELS[0].id}
        >
          {AI_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
      </div>

      {/* API Token Input */}
      <div className="flex items-center space-x-2">
        <label htmlFor="api-token" className="text-sm font-medium text-gray-700">
          API Token:
        </label>
        <input
          id="api-token"
          type="password"
          placeholder="Enter your API token..."
          className="px-3 py-1.5 w-64 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
}
