import Icon from '../../components/Icon';
export const metadata = {
  title: "Contact — KEYAM SPORTS",
  description: "Get in touch with the KEYAM SPORTS newsroom.",
};

const CONTACT_EMAIL = "keyamsports@outlook.com";

export default function Contact() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-primary text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold"><Icon name="mail" className="h-7 w-7" />Contact</h1>
        <p className="opacity-90 mt-1">Tips, corrections, or partnership inquiries — we read everything.</p>
      </div>
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="font-bold text-lg mb-1">Newsroom</h2>
          <p className="text-gray-700">
            Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-semibold hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <div>
          <h2 className="font-bold text-lg mb-1">Corrections</h2>
          <p className="text-gray-700">
            Found an error in one of our stories? Send the headline and what needs fixing —
            we correct verified mistakes promptly.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-lg mb-1">Advertising</h2>
          <p className="text-gray-700">
            Interested in advertising with KEYAM SPORTS? Reach out and we&apos;ll share our media kit.
          </p>
        </div>
      </div>
    </div>
  );
}
