import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fbTrackPageView } from "./useMetaPixel";
import { capiPageView } from "./useMetaCapi";

/**
 * Fires Meta Pixel PageView on every route change.
 * Also sends PageView via CAPI for server-side deduplication.
 *
 * Delays slightly to allow:
 * 1. fbc/fbp cookies to be captured (useMetaFbclid runs in parallel)
 * 2. IP capture to complete
 * 3. User data from localStorage to be available
 */
export function useMetaPageView() {
  const location = useLocation();

  useEffect(() => {
    // Small delay to let fbc/fbp/IP/userData populate
    const timer = setTimeout(() => {
      fbTrackPageView();
      // CAPI PageView — fires with all available user data
      capiPageView();
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
