import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mainSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

describe("release runtime contracts", () => {
  it("does not retain calls to the excluded video time-link helper", () => {
    expect(mainSource).not.toMatch(/\bgetSegmentTimeLink\s*\(/);
  });

  it("builds realtime-outline and merge anchors from the existing audio helpers", () => {
    expect(mainSource).toContain(
      "getAudioTimeLink(s.audioName, getSegmentAudioLinkOffsetMs(s))",
    );
    expect(mainSource).toContain(
      "getAudioTimeLink(segment && segment.audioName, getSegmentAudioLinkOffsetMs(segment))",
    );
    expect(mainSource).toContain(
      "getAudioTimeLink(seg.audioName, getSegmentAudioLinkOffsetMs(seg))",
    );
  });
});
