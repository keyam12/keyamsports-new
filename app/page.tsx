import HomeFeed from '../components/HomeFeed';
import { getPublishedArticles } from '../lib/articles';
export const dynamic = 'force-dynamic';
export const metadata = { alternates: { canonical: '/' } };
export default async function Home() {
  const articles = await getPublishedArticles();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return <HomeFeed initialArticles={articles} today={today} />;
}
