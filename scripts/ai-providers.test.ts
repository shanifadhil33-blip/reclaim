import assert from "node:assert/strict";
import {
  geminiModels,
  modelsToPing,
  parseModelList,
  shouldSkipStatus,
  targetsFor,
} from "../src/lib/ai-providers.ts";

assert.deepEqual(parseModelList(undefined, ["a", "b"]), ["a", "b"]);
assert.deepEqual(parseModelList("  ", ["a"]), ["a"]);
assert.deepEqual(parseModelList(" one, two , ,three ", ["a"]), ["one", "two", "three"]);

for (const status of [429, 500, 503, 403, 404]) {
  assert.equal(shouldSkipStatus(status), true, String(status));
}
assert.equal(shouldSkipStatus(400), false);
assert.equal(shouldSkipStatus(401), false);
assert.equal(shouldSkipStatus(200), false);

const defaults = geminiModels({});
assert.deepEqual(defaults, [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-2.5-flash-lite",
]);

const custom = {
  GEMINI_API_KEY: "gemini-key",
  GEMINI_MODELS: "custom-lite, custom-flash",
  GROQ_API_KEY: "groq-key",
  GROQ_MODEL: "custom-groq",
  OPENROUTER_API_KEY: "or-key",
};

assert.deepEqual(
  targetsFor("text", custom).map((target) => `${target.provider}:${target.model}`),
  [
    "gemini:custom-lite",
    "gemini:custom-flash",
    "groq:custom-groq",
    "openrouter:google/gemini-2.5-flash",
    "openrouter:google/gemini-2.5-flash-lite",
    "openrouter:meta-llama/llama-3.3-70b-instruct",
  ],
);

const vision = targetsFor("vision", custom).map((target) => target.provider);
assert.deepEqual(vision.slice(0, 2), ["gemini", "gemini"]);
assert.equal(vision.includes("groq"), false);
assert.equal(vision.at(-1), "openrouter");

assert.deepEqual(targetsFor("letter", { GROQ_API_KEY: "  " }), []);
assert.deepEqual(
  targetsFor("letter", { GROQ_API_KEY: "groq-key" }).map((target) => target.provider),
  ["groq"],
);
assert.equal(targetsFor("vision", { GROQ_API_KEY: "groq-key" }).length, 0);
assert.equal(targetsFor("text", { GEMINI_API_KEY: "gemini-key" })[0]?.model, defaults[0]);

assert.equal(modelsToPing(defaults, false), 1);
assert.equal(modelsToPing(defaults, true), defaults.length);
assert.equal(modelsToPing([], true), 0);

console.log("ai provider checks passed");
