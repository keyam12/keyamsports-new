export default function Header() {
  return (
    <header className="bg-white/90 backdrop-blur border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
        <div className="text-xl sm:text-2xl font-extrabold text-primary tracking-wide whitespace-nowrap">KEYAM SPORTS ⚡️</div>
        <nav className="flex gap-4 text-xs font-bold uppercase tracking-wider overflow-x-auto whitespace-nowrap">
          <a href="/" className="font-semibold hover:text-primary transition">Home</a>
          <a href="/basketball" className="hover:text-primary transition">Basketball</a>
          <a href="/football" className="hover:text-primary transition">Football</a>
          <a href="/baseball" className="hover:text-primary transition">Baseball</a>
          <a href="/soccer" className="hover:text-primary transition">Soccer</a>
          <a href="/odds" className="hover:text-primary transition">🎲 Odds</a>
        </nav>
      </div>
    </header>
  );
}
