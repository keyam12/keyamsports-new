/** Hide only a trailing URL-only source list already represented by source links.
 * Keep stored copy intact and never discard prose, quotes or unknown references.
 */
export function articlePresentation(summary: string, sources: string[] = []) {
  const links = [...new Set(sources)];
  const heading = /(?:^|\n|\s)(?:Sources|Fuentes):\s*/gi;
  let match: RegExpExecArray | null;
  let body = summary;
  while ((match = heading.exec(summary))) {
    const tail = summary.slice(heading.lastIndex);
    const urls = tail.match(/https?:\/\/[^\s<>]+/g) || [];
    const remainder = tail.replace(/https?:\/\/[^\s<>]+/g, '').replace(/[\s*\-•\d.)\[\]]/g, '');
    if (urls.length && !remainder && urls.every(url => links.includes(url))) {
      body = summary.slice(0, match.index).trimEnd();
      break;
    }
  }
  return { body, sources: links };
}
