/** Bound request bytes while streaming, before allocating/decoding the whole body. */
export async function readBoundedText(req: Request, maxBytes: number): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('Invalid body limit');
  const declared = req.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new Error('Request is too large.');
  if (!req.body) return '';
  const reader = req.body.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > maxBytes) throw new Error('Request is too large.');
      chunks.push(item.value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}
