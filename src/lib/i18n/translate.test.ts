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

  it("falls back to English for an unsupported language code", () => {
    expect(translate("fr", "My Journey")).toBe("My Journey");
  });
});
