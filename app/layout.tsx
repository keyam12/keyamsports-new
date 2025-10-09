
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata = {
  title: "KEYAM SPORTS",
  description: "24/7 AI — Never Miss Anything ⚡️"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-6xl mx-auto p-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
