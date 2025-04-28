'use client';

import { useState } from 'react';
import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { ScrollArea } from '@/components/shadcn/scroll-area';

// Modal component for displaying cell content
export function CellContentModalClient({
  isOpen,
  onClose,
  title,
  content,
  isJson = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  isJson?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  // Format JSON content for better readability if needed
  const formattedContent = isJson
    ? (() => {
        try {
          return JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          return content;
        }
      })()
    : content;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-4 max-h-[50vh]">
          <pre className="text-sm p-4 bg-gray-100 dark:bg-gray-900 rounded overflow-auto whitespace-pre-wrap break-words">
            {formattedContent}
          </pre>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button onClick={copyToClipboard}>{copied ? 'Copied!' : 'Copy to Clipboard'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Component for displaying loading state
export function ChartLoadingIndicatorClient() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

// Component for displaying error state
export function ChartErrorDisplayClient({ error }: { error: string }) {
  return <div className="text-destructive text-center p-8">Error loading dashboard: {error}</div>;
}
