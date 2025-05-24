/**
 * Server component for browser automation information
 */
export default function BrowserContent() {
  return (
    <div className="space-y-6 p-6">
      {/* Info Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Browser Automation</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>• Select a Linux or Windows host from the dropdown above</p>
          <p>
            • Click "Take Control" to reserve the host and start your browser automation session
          </p>
          <p>• Use the VNC display to watch your automation in real-time</p>
          <p>• Use the terminal to run playwright commands like:</p>
          <div className="ml-4 font-mono text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
            <div>playwright codegen</div>
            <div>node browser-script.js</div>
            <div>python playwright-script.py</div>
          </div>
        </div>
      </div>
    </div>
  );
}
