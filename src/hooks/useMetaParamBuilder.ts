/**
 * Meta Parameter Builder — Client-Side
 *
 * Implements Meta's Parameter Configuration Library best practices:
 * 1. Captures fbc (click ID) from fbclid query param on landing
 * 2. Generates/reads fbp (browser ID) as early as possible
 * 3. Captures client_ip_address via lightweight API (PRIORITIZES IPv6)
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

// ─── IPv6 detection ────────────────────────────────────────────────────

function isIPv6(ip: string): boolean {
  return ip.includes(":");
}

function isIPv4(ip: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
}

// ─── FBP (Browser ID) ─────────────────────────────────────────────────

export function ensureFbp(): string {
  const existing = getCookie("_fbp");
  if (existing) return existing;

  const timestamp = Date.now();
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  const fbp = `fb.1.${timestamp}.${random}`;

  setCookie("_fbp", fbp, COOKIE_MAX_AGE);
  return fbp;
}

// ─── FBC (Click ID) ───────────────────────────────────────────────────

export function captureFbc(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid");

    if (fbclid) {
      const timestamp = Date.now();
      const fbcValue = `fb.1.${timestamp}.${fbclid}`;

      setCookie("_fbc", fbcValue, COOKIE_MAX_AGE);
      localStorage.setItem("_fbc", fbcValue);
      localStorage.setItem("_fbclid_raw", fbclid);

      return fbcValue;
    }
  } catch {
    // silently ignore
  }

  return getCookie("_fbc") || localStorage.getItem("_fbc");
}

// ─── Client IP Address (IPv6 priority) ─────────────────────────────────

/**
 * Retrieves the client's IP address using a lightweight API.
 * ALWAYS prioritizes IPv6 per Meta's recommendation.
 * If a cached IPv4 exists, forces re-fetch to try to get IPv6.
 */
export async function captureClientIp(): Promise<string | null> {
  // Check cached value — if it's already IPv6, use it
  const cached = getCookie(IP_COOKIE) || localStorage.getItem(IP_STORAGE_KEY);
  if (cached && isIPv6(cached)) return cached;

  // If cached is IPv4 or no cache, try to get IPv6
  try {
    // api64.ipify.org returns IPv6 when available
    const res = await fetch("https://api64.ipify.org?format=json", {
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    const ip = data.ip;

    if (ip) {
      setCookie(IP_COOKIE, ip, COOKIE_MAX_AGE);
      localStorage.setItem(IP_STORAGE_KEY, ip);
      return ip;
    }
  } catch {
    // If api64 fails and we have a cached IPv4, keep it
    if (cached) return cached;

    // Last resort: try IPv4-only endpoint
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

  return cached || null;
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
