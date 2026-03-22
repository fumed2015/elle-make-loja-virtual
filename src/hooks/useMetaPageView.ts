import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fbTrackPageView } from "./useMetaPixel";
import { capiPageView } from "./useMetaCapi";

/**
 * Fires Meta Pixel PageView on every route change.
 * Also sends PageView via CAPI for server-side deduplication.
 * Must be used inside a <BrowserRouter>.
 */
export function useMetaPageView() {
  const location = useLocation();

  useEffect(() => {
    fbTrackPageView();

    // Send PageView via CAPI (server-side) — fires after a short delay
    // to allow IP capture and user data to be available
    const timer = setTimeout(() => {
      capiPageView();
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
