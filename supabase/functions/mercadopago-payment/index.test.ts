import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mercadopago-payment`;

// Helper: compute HMAC-SHA256 hex
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.test("Webhook rejects request without signature headers", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "payment", data: { id: "999999" } }),
  });
  const body = await res.text();
  // Should be 403 (invalid signature) since no x-signature header
  assertEquals(res.status, 403, `Expected 403, got ${res.status}: ${body}`);
});

Deno.test("Webhook rejects request with invalid signature", async () => {
  const ts = Math.floor(Date.now() / 1000).toString();
  const fakeSignature = `ts=${ts},v1=0000000000000000000000000000000000000000000000000000000000000000`;

  const res = await fetch(`${FUNCTION_URL}?data.id=123456`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": fakeSignature,
      "x-request-id": "test-request-id-invalid",
    },
    body: JSON.stringify({ type: "payment", data: { id: "123456" } }),
  });
  const body = await res.text();
  assertEquals(res.status, 403, `Expected 403, got ${res.status}: ${body}`);
});

Deno.test("Webhook accepts request with valid HMAC signature", async () => {
  // We need the actual webhook secret to compute a valid signature.
  // This test validates the flow end-to-end only if MERCADO_PAGO_WEBHOOK_SECRET is available.
  const webhookSecret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.log("⚠️ MERCADO_PAGO_WEBHOOK_SECRET not set — skipping valid signature test");
    return;
  }

  const dataId = "99999999"; // fake payment ID (will fail MP API lookup but should pass signature)
  const requestId = `test-${crypto.randomUUID()}`;
  const ts = Math.floor(Date.now() / 1000).toString();
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = await hmacSha256(webhookSecret, manifest);

  const res = await fetch(`${FUNCTION_URL}?data.id=${dataId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": `ts=${ts},v1=${v1}`,
      "x-request-id": requestId,
    },
    body: JSON.stringify({ type: "payment", data: { id: dataId } }),
  });
  const body = await res.text();
  // Should NOT be 403 — signature is valid. May be 500 (MP API fails for fake ID) or 200.
  assertNotEquals(res.status, 403, `Got 403 with valid signature: ${body}`);
});

Deno.test("get-public-key action returns public key", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action: "get-public-key" }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertNotEquals(body.public_key, undefined, "public_key should be present");
});
