/**
 * Server component for code page
 * Displays StackBlitz iframe for code editing
 */
export default async function CodeContent() {
  return (
    <div className="space-y--5 p-4">
      <div className="flex items-center"></div>
      <div className="w-full">
        <iframe
          src="https://stackblitz.com/github/vercel/next.js/tree/canary/examples/hello-world"
          className="w-full h-[600px] border border-gray-300 rounded-lg"
          title="StackBlitz Code Environment"
        />
      </div>
    </div>
  );
}
