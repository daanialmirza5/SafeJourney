import { PageHeader } from "@/components/ui/EmptyState";
import { ScanPanel } from "./ScanPanel";

export default function ScanPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Scan Referral Passport" description="Scan a QR code with your camera, or type the referral ID manually." />
      <ScanPanel />
    </div>
  );
}
