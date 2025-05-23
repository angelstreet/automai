'use client';

/**
 * Message input component - text input with send button
 */
export default function MessageInput() {
  return (
    <div className="flex items-center px-4 py-3 h-full">
      <div className="flex-1 flex items-center space-x-3">
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            placeholder="Type your message here..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            rows={2}
            style={{ maxHeight: '80px', minHeight: '44px' }}
          />
        </div>

        {/* Send Button */}
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium">
          Send
        </button>
      </div>
    </div>
  );
}
