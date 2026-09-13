"use client";

import { Download, Printer } from "lucide-react";

export function PassportActions({ qrDataUrl }: { referralId: string; qrDataUrl: string }) {
  function print() {
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) return;
    win.document.write(`
      <html><head><title>Referral Passport</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 24px;">
        <h2>SafeJourney Referral Passport</h2>
        <img src="${qrDataUrl}" alt="QR code" style="width:240px;height:240px;" />
        <p style="color:#666;font-size:12px;">Scan with an authorized SafeJourney account.</p>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="flex gap-1.5 no-print">
      <a
        href={qrDataUrl}
        download="referral-passport-qr.png"
        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
      >
        <Download className="size-3.5" /> Download
      </a>
      <button onClick={print} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
        <Printer className="size-3.5" /> Print
      </button>
    </div>
  );
}
