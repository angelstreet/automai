export default function AuthLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = React.use(params);

  return (
    <div className="relative min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
} 