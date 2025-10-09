
export default function Header() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto p-4 flex items-center gap-6">
        <div className="text-2xl font-extrabold text-primary tracking-wide">KEYAM SPORTS ⚡️</div>
        <nav className="flex gap-4 ml-4 text-sm">
          <a href="/" className="font-semibold">Home</a>
          <a href="/basketball">Basketball</a>
          <a href="/baseball">Baseball</a>
          <a href="/soccer">Soccer</a>
        </nav>
      </div>
    </header>
  );
}
