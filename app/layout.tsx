
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BreakingTicker from "../components/BreakingTicker";

export const metadata = {
  title: "KEYAM SPORTS",
  description: "24/7 AI — Never Miss Anything ⚡️",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://keyam-sports.vercel.app"),
  openGraph: {
    title: "KEYAM SPORTS",
    description: "24/7 AI — Never Miss Anything ⚡️",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KEYAM SPORTS",
    description: "24/7 AI — Never Miss Anything ⚡️",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <BreakingTicker />
        <main className="flex-1 max-w-6xl mx-auto p-6 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
