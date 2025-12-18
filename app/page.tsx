import MainDashboard from '@/components/layout/MainDashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 px-4 py-8 md:px-8 lg:px-16 font-sans text-neutral-900">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
          AdSense Ifrit
        </h1>
        <p className="text-lg text-neutral-600 max-w-xl mx-auto">
          AI-powered content factory for high-revenue monetization
        </p>
      </header>

      {/* Main Dashboard */}
      <MainDashboard />

      <footer className="mt-16 py-6 border-t border-neutral-200 text-center text-neutral-500 text-sm">
        &copy; 2025 AdSense Ifrit. Content Factory + Store System.
      </footer>
    </main>
  );
}
