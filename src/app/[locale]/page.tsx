import { Features, Hero, SiteHeader } from './(marketing)/_components';

export default async function Page() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="flex flex-col">
          <Hero />
          <Features />
        </div>
      </main>
    </div>
  );
}
