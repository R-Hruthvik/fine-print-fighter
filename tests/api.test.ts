import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/extract/route";

const key = process.env.NEBIUS_API_KEY;
afterEach(() => { if (key === undefined) delete process.env.NEBIUS_API_KEY; else process.env.NEBIUS_API_KEY = key; });
const post = (body: string) => new Request("http://localhost/api/extract", { method: "POST", body });
test("primary endpoint returns safe typed errors and no-store for invalid JSON and unconfigured analysis", async () => {
  const malformed = await POST(post("{"));
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers.get("cache-control"), "no-store");
  assert.equal((await malformed.json()).code, "INVALID_JSON");
  delete process.env.NEBIUS_API_KEY;
  const unconfigured = await POST(post(JSON.stringify({ documentText: "A bill", companyResponse: "The company declined the request.", packId: "surprise-bill", country: "US" })));
  assert.equal(unconfigured.status, 503);
  const error = await unconfigured.json();
  assert.equal(error.code, "CONFIGURATION_MISSING");
  assert.equal(error.retryable, false);
  assert.equal(typeof error.requestId, "string");
});
