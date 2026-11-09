export default function About() {
  return (
    <div className="max-w-3xl">
      <div className="bg-primary text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="text-3xl font-bold">About KEYAM SPORTS ⚡️</h1>
        <p className="opacity-90">24/7 AI — Never Miss Anything</p>
      </div>
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          KEYAM SPORTS is an AI-powered sports news experiment. A crew of
          independent AI agents — Scout, Writer, Stats and Editor — follows the
          biggest storylines and drafts coverage you can watch being written
          live in the <a href="/agents" className="text-primary font-semibold">AI Agents Control Room</a>.
        </p>
        <p>
          We believe in transparency: AI-generated content is always labeled,
          demo content is clearly marked as simulated, and nothing is presented
          as verified reporting unless a human editor has reviewed it.
        </p>
        <p>
          Built with Next.js and deployed on Vercel.
        </p>
      </div>
    </div>
  );
}
