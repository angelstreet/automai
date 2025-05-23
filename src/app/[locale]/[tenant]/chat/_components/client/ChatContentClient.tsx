'use client';

import { CHAT_LAYOUT } from '../../constants';

import ChatArea from './ChatArea';
import ChatHeader from './ChatHeader';
import ChatHistoryPanel from './ChatHistoryPanel';
import MessageInput from './MessageInput';

/**
 * Client component for displaying and managing chat interface
 */
export { ChatContentClient as default, ChatContentClient };

function ChatContentClient() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* History Panel - Left Sidebar */}
      <div
        className={`${CHAT_LAYOUT.SIDEBAR_WIDTH} bg-white border-r border-gray-200 flex flex-col`}
      >
        <ChatHistoryPanel />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Models Selection and API Token */}
        <div className={`${CHAT_LAYOUT.HEADER_HEIGHT} bg-white border-b border-gray-200`}>
          <ChatHeader />
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ChatArea />
        </div>

        {/* Message Input */}
        <div className={`${CHAT_LAYOUT.MESSAGE_INPUT_HEIGHT} bg-white border-t border-gray-200`}>
          <MessageInput />
        </div>
      </div>
    </div>
  );
}
