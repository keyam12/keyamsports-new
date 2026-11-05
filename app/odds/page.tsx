import OddsWidget from '../../components/OddsWidget';

export const metadata = {
  title: 'Betting Odds — KEYAM SPORTS',
  description: 'Pre-game moneyline odds for NBA, NFL, MLB and soccer.',
};

export default function OddsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-gray-900 via-primary to-accent text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="text-3xl font-bold">🎲 Betting Odds</h1>
        <p className="opacity-90 mt-1">Pre-game moneylines from major US sportsbooks. Informational only.</p>
      </div>
      <OddsWidget limit={15} />
    </div>
  );
}
