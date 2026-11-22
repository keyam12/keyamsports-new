export default function About() {
  return (
    <div className="max-w-3xl">
      <div className="bg-primary text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="text-3xl font-bold">About KEYAM SPORTS</h1>
        <p className="opacity-90">Sports coverage with transparent AI assistance</p>
      </div>
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          KEYAM SPORTS covers sports with AI-assisted discovery, research and writing.
          A Senior Editor agent reviews the evidence and classifies stories before publication.
          Eligible low-risk stories may publish automatically; unsupported or sensitive reports are retained.
        </p>
        <p>
          AI-assisted articles are labeled. Automated checks can miss errors and do not
          constitute independent confirmation of every claim. Sources accompany the reporting.
          Report factual concerns through our <a href="/contact" className="text-primary font-semibold">contact page</a>.
        </p>
        <p>
          Built with Next.js and deployed on Vercel.
        </p>
      </div>
    </div>
  );
}
