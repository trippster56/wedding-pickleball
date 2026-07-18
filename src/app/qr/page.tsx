"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button, Kicker } from "@/components/ui";

export default function QrPage() {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const origin = window.location.origin;
    setUrl(origin);
    QRCode.toDataURL(origin, {
      width: 900,
      margin: 2,
      color: { dark: "#2c2c2c", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="w-full max-w-xl mx-auto px-5 pb-24 min-h-screen">
      <header className="text-center pt-10 pb-4">
        <Kicker>Scan to Join</Kicker>
        <h1 className="font-serif text-3xl sm:text-4xl text-charcoal-900 mt-2">
          Share the Bracket
        </h1>
        <div className="mx-auto w-16 h-px bg-blue-400 my-4" />
        <p className="text-charcoal-500 text-sm">
          Everyone who scans can view and score live.
        </p>
      </header>

      <div className="bg-white border border-cream-300 rounded-sm shadow-sm p-6 text-center">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="QR code to open the tournament bracket"
            className="w-full max-w-xs mx-auto"
          />
        ) : (
          <div className="aspect-square max-w-xs mx-auto flex items-center justify-center text-charcoal-400 text-sm">
            Generating…
          </div>
        )}
        <p className="mt-4 text-charcoal-600 text-sm break-all">{url}</p>
        <div className="mt-4 flex gap-3 justify-center">
          <Button onClick={copy} variant="outline" size="sm">
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            Print
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-charcoal-400">
        Tip: once deployed, this QR points at your live Vercel URL automatically.
      </p>

      <div className="mt-6 flex justify-center">
        <Button href="/" variant="ghost" size="sm">
          ← Back to bracket
        </Button>
      </div>
    </main>
  );
}
