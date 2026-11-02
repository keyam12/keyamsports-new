'use client';
import { useEffect } from 'react';

// Google AdSense ad slot.
// - Set NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX in Vercel env vars
//   and NEXT_PUBLIC_ADSLOT_<NAME>=1234567890 for each placement to go live.
// - Until then it renders a clearly-labeled "Advertisement" placeholder,
//   so the layout reserves the space and the page looks intentional.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
const isLive = CLIENT.startsWith('ca-pub-');

const SIZES: Record<string, string> = {
  leaderboard: 'min-h-[90px]',
  rectangle: 'min-h-[250px]',
  infeed: 'min-h-[120px]',
};

export default function AdSlot({
  slot,
  format = 'infeed',
  label,
}: {
  slot: string; // NEXT_PUBLIC_ADSLOT_* value or the raw ad-slot id
  format?: 'leaderboard' | 'rectangle' | 'infeed';
  label?: string;
}) {
  useEffect(() => {
    if (!isLive) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      /* AdSense not ready yet */
    }
  }, []);

  if (!isLive) {
    return (
      <div
        className={`w-full ${SIZES[format]} rounded-xl border-2 border-dashed border-gray-300 bg-gray-100/70 flex flex-col items-center justify-center gap-1 py-6 text-gray-400 select-none`}
        aria-label="Advertisement placeholder"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Advertisement</span>
        {label && <span className="text-xs">{label}</span>}
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle block"
      style={{ display: 'block' }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format === 'leaderboard' ? 'horizontal' : 'auto'}
      data-full-width-responsive="true"
    />
  );
}
