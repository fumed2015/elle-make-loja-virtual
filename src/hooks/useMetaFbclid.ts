import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Captures the `fbclid` query parameter from Meta ad clicks and persists it
 * as an `_fbc` first-party cookie + localStorage fallback.
 *
 * The _fbc format follows Meta's spec: fb.1.<timestamp>.<fbclid>
 *
 * This dramatically improves the fbc coverage (currently 0.94%)
 * by ensuring the identifier survives SPA route transitions.
 */

const FBC_COOKIE = "_fbc";
const FBC_STORAGE_KEY = "_fbc";
const FBCLID_STORAGE_KEY = "_fbclid_raw";
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days

function setCookie(name: string, value: string, maxAge: number) {
  const secure = location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Returns the current _fbc value from cookie or localStorage.
 */
export function getFbc(): string | null {
  return getCookie(FBC_COOKIE) || localStorage.getItem(FBC_STORAGE_KEY);
}

/**
 * Returns the _fbp (browser ID) value from cookie.
 * Format: fb.1.<creation_time>.<random_number>
 * Set automatically by Meta's pixel.js
 */
export function getFbp(): string | null {
  return getCookie("_fbp");
}

/**
 * Returns the raw fbclid value.
 */
export function getFbclid(): string | null {
  return localStorage.getItem(FBCLID_STORAGE_KEY);
}

export function useMetaFbclid() {
  const location = useLocation();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fbclid = params.get("fbclid");

      if (fbclid) {
        // Build _fbc in Meta's format: fb.1.<creation_time>.<fbclid>
        const timestamp = Date.now();
        const fbcValue = `fb.1.${timestamp}.${fbclid}`;

        // Store in cookie (primary)
        setCookie(FBC_COOKIE, fbcValue, COOKIE_MAX_AGE);

        // Store in localStorage (fallback for cookie blockers)
        localStorage.setItem(FBC_STORAGE_KEY, fbcValue);
        localStorage.setItem(FBCLID_STORAGE_KEY, fbclid);

        console.debug("[Meta] fbc captured:", fbcValue);
      }
    } catch {
      // silently ignore
    }
  }, [location.search]);
}
