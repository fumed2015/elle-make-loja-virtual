import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fbTrackPageView } from "./useMetaPixel";
import { capiPageView } from "./useMetaCapi";
import { ensureAllParamsSync, captureClientIp } from "./useMetaParamBuilder";

/**
 * Fires Meta Pixel PageView on every route change.
 * Also sends PageView via CAPI for server-side deduplication.
 *
 * Ensures fbc/fbp are captured synchronously BEFORE firing,
 * then waits for async IP capture to complete.
 */
export function useMetaPageView() {
  const location = useLocation();

  useEffect(() => {
    // Synchronously capture fbc/fbp before any event fires
    ensureAllParamsSync();
    // Async: start IPv6 capture
    captureClientIp();

    // Delay to let IP capture and user data populate
    const timer = setTimeout(() => {
      fbTrackPageView();
      capiPageView();
    }, 400);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
