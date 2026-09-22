import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "./push";

describe("urlBase64ToUint8Array", () => {
  it("decodes a padded base64 string", () => {
    // "Hi" is "SGk=" in base64.
    expect([...urlBase64ToUint8Array("SGk=")]).toEqual([72, 105]);
  });

  it("adds the padding a VAPID key leaves off", () => {
    // The same bytes, written the way a VAPID key is -- unpadded.
    expect([...urlBase64ToUint8Array("SGk")]).toEqual([72, 105]);
  });

  it("translates the url-safe alphabet", () => {
    // `-` and `_` stand in for `+` and `/`; decoding them literally throws.
    expect(() => urlBase64ToUint8Array("--__")).not.toThrow();
    expect([...urlBase64ToUint8Array("--__")]).toEqual([...urlBase64ToUint8Array("++//")]);
  });
});
