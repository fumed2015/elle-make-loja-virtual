import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/yampi-checkout`;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
};

// ── Helper ──────────────────────────────────────────────
function makeOrderPayload(overrides: Record<string, unknown> = {}) {
  return {
    action: "create-order",
    items: [{ product_id: "test-1", name: "Batom Teste", price: 29.9, quantity: 1 }],
    customer: { name: "CI Test", email: "ci@test.com", phone: "91999999999", cpf: "00000000000" },
    address: { street: "Rua CI", number: "1", neighborhood: "Centro", city: "Belém", state: "PA", zip: "66000000" },
    total: 29.9,
    discount: 0,
    supabase_order_id: "ci-test-" + Date.now(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────

Deno.test("create-order returns checkout_url with customer params", async () => {
  const res = await fetch(FUNCTION_URL, { method: "POST", headers, body: JSON.stringify(makeOrderPayload()) });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.success, true);
  assertStringIncludes(data.checkout_url, "checkout.yampi.com.br");
  assertStringIncludes(data.checkout_url, "first_name=CI");
  assertStringIncludes(data.checkout_url, "email=ci%40test.com");
  assertStringIncludes(data.checkout_url, "zipcode=66000000");
});

Deno.test("create-order with coupon includes coupon param", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(makeOrderPayload({ coupon_code: "TESTE10" })),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertStringIncludes(data.checkout_url, "coupon=TESTE10");
});

Deno.test("get-checkout-url returns URL without creating order", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "get-checkout-url",
      customer: { name: "Quick Test", email: "quick@test.com", phone: "91888888888" },
      address: { zip: "66000000", city: "Belém", state: "PA" },
    }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.success, true);
  assertStringIncludes(data.checkout_url, "first_name=Quick");
});

Deno.test("webhook order.created is acknowledged", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event: "order.created",
      resource: {
        id: 99999,
        value_total: 19.9,
        customer: { data: { first_name: "WebhookCI", phone: { full_number: "5591900000000" } } },
        items: { data: [{ name: "Produto CI", quantity: 1, price: 19.9 }] },
      },
    }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.received, true);
  assertEquals(data.event, "order.created");
});

Deno.test("unknown action returns 400", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "invalid-action" }),
  });
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error, "Unknown action");
});

Deno.test("CORS preflight returns 200", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://example.com", "Access-Control-Request-Method": "POST" },
  });
  assertEquals(res.status, 200);
  await res.text(); // consume body
});
