'use client';

import { CHAT_LAYOUT } from '../../constants';

import { ChatProvider } from './ChatContext';
import ChatHeader from './ChatHeader';
import ChatHistoryPanel from './ChatHistoryPanel';
import MessageInput from './MessageInput';
import ChatContent from './ChatContent';

/**
 * Client component for displaying and managing chat interface
 */
export { ChatContentClient as default, ChatContentClient };

function ChatContentClient() {
  return (
    <ChatProvider>
      <div className="flex h-screen bg-transparent">
        {/* History Panel - Left Sidebar */}
        <div
          className={`${CHAT_LAYOUT.SIDEBAR_WIDTH} bg-background/80 backdrop-blur-sm border-r border-border flex flex-col`}
        >
          <ChatHistoryPanel />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with Models Selection and API Token */}
          <div
            className={`${CHAT_LAYOUT.HEADER_HEIGHT} bg-background/80 backdrop-blur-sm border-b border-border flex-shrink-0`}
          >
            <ChatHeader />
          </div>

          {/* Chat Messages Area - Real data from database */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatContent />
          </div>

          {/* Message Input - Fixed at bottom */}
          <div className="flex-shrink-0 bg-background/80 backdrop-blur-sm border-t border-border">
            <MessageInput />
          </div>
        </div>
      </div>
    </ChatProvider>
  );
}
