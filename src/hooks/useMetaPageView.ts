import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fbTrackPageView } from "./useMetaPixel";

/**
 * Fires Meta Pixel PageView on every route change.
 * Must be used inside a <BrowserRouter>.
 */
export function useMetaPageView() {
  const location = useLocation();

  useEffect(() => {
    fbTrackPageView();
  }, [location.pathname]);
}
