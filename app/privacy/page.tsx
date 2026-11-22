export default function Privacy() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p><strong>Last updated:</strong> November 2026</p>
        <p>
          KEYAM SPORTS ("we") respects your privacy. This policy explains what
          we collect and why.
        </p>
        <h2 className="text-xl font-bold text-gray-900 pt-2">What we collect</h2>
        <p>
          Readers do not need an account. Hosting and service providers process technical
          request data to deliver and secure the site, which may include IP addresses,
          timestamps, requested URLs and browser information. This information should not
          be assumed anonymous. The editorial administration area is private.
        </p>
        <h2 className="text-xl font-bold text-gray-900 pt-2">Cookies & advertising</h2>
        <p>
          Saved league preferences use browser localStorage under keyam-favorites; you can
          clear them through your browser. Administrative sign-in uses a signed session cookie
          with an eight-hour lifetime. Advertising is an optional integration; any activation
          must account for the applicable tracking and consent requirements. Browser settings
          alone are not a substitute for consent where prior consent is required.
        </p>
        <h2 className="text-xl font-bold text-gray-900 pt-2">AI-generated content</h2>
        <p>
          Some content on this site is generated or assisted by artificial
          intelligence and is labeled as such. AI output may contain errors —
          verify important facts independently.
        </p>
        <h2 className="text-xl font-bold text-gray-900 pt-2">Editorial service providers</h2>
        <p>
          The current editorial workflow uses Vercel for hosting, Supabase for stored articles
          and operational records, and OpenAI for AI-assisted preparation and review. News
          inputs and editorial text may be processed by these providers. Public readers are
          not offered an unrestricted prompt-submission service.
        </p>
        <h2 className="text-xl font-bold text-gray-900 pt-2">Requests about your data</h2>
        <p>
          Use the contact page for privacy or deletion requests. Include enough information
          to identify the request without sending passwords or unnecessary sensitive details.
          Operational records support security and editorial accountability; the applicable
          retention and response requirements depend on the information and circumstances.
        </p>
        <h2 className="text-xl font-bold text-gray-900 pt-2">Contact</h2>
        <p>Questions about this policy: use the newsroom email listed on the Contact page.</p>
      </div>
    </div>
  );
}
