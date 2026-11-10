import Icon from './Icon';

export default function Header() {
  return (
    <header className="bg-white/90 backdrop-blur border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
        <a href="/" aria-label="KEYAM SPORTS — Home" className="text-xl sm:text-2xl font-extrabold text-primary tracking-wide whitespace-nowrap rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">KEYAM SPORTS</a>
        <nav className="flex gap-4 text-xs font-bold uppercase tracking-wider overflow-x-auto whitespace-nowrap">
          <a href="/" className="font-semibold hover:text-primary transition">Home</a>
          <a href="/basketball" className="hover:text-primary transition">Basketball</a>
          <a href="/football" className="hover:text-primary transition">Football</a>
          <a href="/baseball" className="hover:text-primary transition">Baseball</a>
          <a href="/soccer" className="hover:text-primary transition">Soccer</a>
          <a href="/odds" className="inline-flex items-center gap-1.5 hover:text-primary transition"><Icon name="chart" className="h-3.5 w-3.5" />Odds</a>
        </nav>
      </div>
    </header>
  );
}
