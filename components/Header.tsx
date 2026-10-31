
export default function Header() {
  return (
    <header className="bg-white/90 backdrop-blur border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto p-4 flex items-center gap-6">
        <div className="text-2xl font-extrabold text-primary tracking-wide">KEYAM SPORTS ⚡️</div>
        <nav className="flex gap-4 ml-4 text-sm">
          <a href="/" className="font-semibold hover:text-primary transition">Home</a>
          <a href="/basketball" className="hover:text-primary transition">Basketball</a>
          <a href="/baseball" className="hover:text-primary transition">Baseball</a>
          <a href="/soccer" className="hover:text-primary transition">Soccer</a>
          <a href="/agents" className="font-semibold text-primary hover:opacity-80 transition">🤖 AI Agents</a>
        </nav>
      </div>
    </header>
  );
}
