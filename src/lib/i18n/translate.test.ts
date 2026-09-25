import { describe, it, expect } from "vitest";
import { translate } from "./translate";

describe("translate (spec section 27)", () => {
  it("returns the English string unchanged for English", () => {
    expect(translate("en", "My Journey")).toBe("My Journey");
  });

  it("returns a real Hindi translation for a covered string", () => {
    expect(translate("hi", "My Journey")).toBe("मेरी यात्रा");
    expect(translate("hi", "My Journey")).not.toBe("My Journey");
  });

  it("returns a real Marathi translation for a covered string", () => {
    expect(translate("mr", "My Journey")).toBe("माझा प्रवास");
    expect(translate("mr", "My Journey")).not.toBe("My Journey");
  });

  it("falls back to the original English string when no translation is registered", () => {
    expect(translate("hi", "Some untranslated future string")).toBe("Some untranslated future string");
  });

  it("returns maternal health and postpartum translations", () => {
    expect(translate("hi", "Maternal health record")).toBe("मातृ स्वास्थ्य रिकॉर्ड");
    expect(translate("mr", "Maternal health record")).toBe("मातृ आरोग्य नोंद");
    expect(translate("hi", "Emergency helpline")).toBe("आपातकालीन हेल्पलाइन");
    expect(translate("mr", "Emergency helpline")).toBe("आपत्कालीन हेल्पलाइन");
  });
});
