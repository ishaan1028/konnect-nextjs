// A Server Component (the default in the App Router): it renders on the server
// and ships zero JavaScript to the browser. Replaced by the feed in Phase 9.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Konnect</h1>
      <p className="max-w-sm text-balance opacity-70">
        Share moments, follow friends, and chat in real time.
      </p>
    </main>
  );
}
