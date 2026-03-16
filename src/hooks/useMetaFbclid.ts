import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureFbc, ensureFbp, captureClientIp } from "./useMetaParamBuilder";

/**
 * Captures Meta attribution parameters as early as possible:
 * 1. _fbc from fbclid query param (on every route change)
 * 2. _fbp browser ID (generated if not set by pixel.js)
 * 3. client_ip_address (via lightweight API, cached in cookie)
 *
 * Best practice: run on page load AND every route change.
 */
export function useMetaFbclid() {
  const location = useLocation();

  useEffect(() => {
    // Capture fbc on every route change (fbclid may appear on any landing page)
    captureFbc();

    // Ensure fbp exists as early as possible
    ensureFbp();

    // Capture client IP (async, non-blocking) — only fetches once, then cached
    captureClientIp();
  }, [location.search]);
}
