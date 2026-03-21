/**
 * Meta Parameter Builder — Client-Side
 *
 * Implements Meta's Parameter Configuration Library best practices:
 * 1. Captures fbc (click ID) from fbclid query param on landing
 * 2. Generates/reads fbp (browser ID) as early as possible
 * 3. Captures client_ip_address via lightweight API
 * 4. Stores all params in cookies for CAPI server-side retrieval
 *
 * Format spec:
 *   _fbc: fb.1.<creation_time>.<fbclid>
 *   _fbp: fb.1.<creation_time>.<random_number>
 *
 * IMPORTANT: Cookie values are case-sensitive — never lowercase _fbc.
 */

const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days
const IP_COOKIE = "_meta_ip";
const IP_STORAGE_KEY = "_meta_client_ip";

// ─── Cookie helpers ────────────────────────────────────────────────────

function setCookie(name: string, value: string, maxAge: number) {
  const secure = location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── FBP (Browser ID) ─────────────────────────────────────────────────

/**
 * Ensures _fbp cookie exists. If Meta's pixel.js hasn't set it yet,
 * we generate one following Meta's format: fb.1.<creation_time>.<random_number>
 */
export function ensureFbp(): string {
  const existing = getCookie("_fbp");
  if (existing) return existing;

  // Generate fbp: fb.1.<timestamp>.<random 10-digit number>
  const timestamp = Date.now();
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  const fbp = `fb.1.${timestamp}.${random}`;

  setCookie("_fbp", fbp, COOKIE_MAX_AGE);
  return fbp;
}

// ─── FBC (Click ID) ───────────────────────────────────────────────────

/**
 * Captures fbclid from URL and persists as _fbc cookie.
 * Format: fb.1.<creation_time>.<fbclid>
 *
 * CRITICAL: _fbc is case-sensitive — never convert to lowercase.
 */
export function captureFbc(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid");

    if (fbclid) {
      const timestamp = Date.now();
      const fbcValue = `fb.1.${timestamp}.${fbclid}`;

      // Primary: cookie (case-sensitive, do NOT modify the value)
      setCookie("_fbc", fbcValue, COOKIE_MAX_AGE);

      // Fallback: localStorage for cookie-blocked browsers
      localStorage.setItem("_fbc", fbcValue);
      localStorage.setItem("_fbclid_raw", fbclid);

      console.debug("[Meta ParamBuilder] fbc captured:", fbcValue);
      return fbcValue;
    }
  } catch {
    // silently ignore
  }

  return getCookie("_fbc") || localStorage.getItem("_fbc");
}

// ─── Client IP Address ─────────────────────────────────────────────────

/**
 * Retrieves the client's IP address using a lightweight API.
 * Prioritizes IPv6 over IPv4 per Meta's recommendation.
 * Stores result in cookie for server-side CAPI retrieval.
 */
export async function captureClientIp(): Promise<string | null> {
  // Check cached value first
  const cached = getCookie(IP_COOKIE) || localStorage.getItem(IP_STORAGE_KEY);
  if (cached) return cached;

  try {
    // Try IPv6-first endpoint
    const res = await fetch("https://api64.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    const ip = data.ip;

    if (ip) {
      setCookie(IP_COOKIE, ip, COOKIE_MAX_AGE);
      localStorage.setItem(IP_STORAGE_KEY, ip);
      console.debug("[Meta ParamBuilder] client IP captured:", ip);
      return ip;
    }
  } catch {
    // Fallback: try IPv4-only endpoint
    try {
      const res = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      const ip = data.ip;

      if (ip) {
        setCookie(IP_COOKIE, ip, COOKIE_MAX_AGE);
        localStorage.setItem(IP_STORAGE_KEY, ip);
        return ip;
      }
    } catch {
      // silently ignore
    }
  }

  return null;
}

// ─── Get stored params ─────────────────────────────────────────────────

export function getFbc(): string | null {
  return getCookie("_fbc") || localStorage.getItem("_fbc");
}

export function getFbp(): string | null {
  return getCookie("_fbp") || localStorage.getItem("_fbp");
}

export function getClientIp(): string | null {
  return getCookie(IP_COOKIE) || localStorage.getItem(IP_STORAGE_KEY);
}

/**
 * Returns all Meta attribution params for CAPI enrichment.
 */
export function getMetaParams(): {
  fbc: string | null;
  fbp: string | null;
  client_ip_address: string | null;
  client_user_agent: string;
} {
  return {
    fbc: getFbc(),
    fbp: getFbp(),
    client_ip_address: getClientIp(),
    client_user_agent: navigator.userAgent,
  };
}
