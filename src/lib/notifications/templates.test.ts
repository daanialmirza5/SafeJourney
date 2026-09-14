import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { notificationTemplate: { findUnique: vi.fn() } },
}));

import { db } from "@/lib/db";
import { interpolate, renderNotificationTemplate, NOTIFICATION_TEMPLATE_DEFAULTS } from "./templates";

describe("interpolate", () => {
  it("fills in every matching {{placeholder}}", () => {
    expect(interpolate("Referral {{code}} for {{name}}", { code: "SJ-1", name: "Ananya" })).toBe(
      "Referral SJ-1 for Ananya"
    );
  });

  it("leaves an unmatched placeholder token as-is", () => {
    expect(interpolate("Hello {{missing}}", {})).toBe("Hello {{missing}}");
  });
});

describe("renderNotificationTemplate (spec section 56 admin-editable notification copy)", () => {
  it("uses the compiled-in default, interpolated, when no admin override exists", async () => {
    vi.mocked(db.notificationTemplate.findUnique).mockResolvedValueOnce(null);
    const result = await renderNotificationTemplate("REFERRAL_ACCEPTED_DOCTOR", {
      facilityName: "Riverbend Women & Newborn Hospital",
      referralCode: "SJ-2026-1",
    });
    expect(result.title).toBe("Referral accepted");
    expect(result.body).toBe("Riverbend Women & Newborn Hospital accepted referral SJ-2026-1.");
  });

  it("prefers an admin-edited title/body when an override row exists", async () => {
    vi.mocked(db.notificationTemplate.findUnique).mockResolvedValueOnce({
      id: "t1",
      key: "REFERRAL_ACCEPTED_DOCTOR",
      category: "REFERRAL",
      title: "Custom title",
      body: "Custom body for {{referralCode}}",
      updatedAt: new Date(),
    } as never);
    const result = await renderNotificationTemplate("REFERRAL_ACCEPTED_DOCTOR", { referralCode: "SJ-2026-2" });
    expect(result.title).toBe("Custom title");
    expect(result.body).toBe("Custom body for SJ-2026-2");
  });

  it("throws for an unknown template key rather than silently sending blank copy", async () => {
    await expect(renderNotificationTemplate("NOT_A_REAL_KEY", {})).rejects.toThrow(/unknown/i);
  });

  it("every default template's declared placeholders actually appear in its body", () => {
    for (const def of NOTIFICATION_TEMPLATE_DEFAULTS) {
      for (const placeholder of def.placeholders) {
        expect(def.body).toContain(`{{${placeholder}}}`);
      }
    }
  });
});
