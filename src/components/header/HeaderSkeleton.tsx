export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />
      <div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />
    </div>
  );
}
