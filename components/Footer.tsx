export default function Footer() {
  return (
    <footer className="border-t">
      <div className="max-w-6xl mx-auto p-4 text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>© {new Date().getFullYear()} KEYAM SPORTS — 24/7 AI — Never Miss Anything ⚡️</span>
        <nav className="flex gap-4 ml-auto">
          <a href="/about" className="hover:text-primary transition">About</a>
          <a href="/contact" className="hover:text-primary transition">Contact</a>
          <a href="/privacy" className="hover:text-primary transition">Privacy</a>
          <a href="/terms" className="hover:text-primary transition">Terms</a>
        </nav>
      </div>
    </footer>
  );
}
