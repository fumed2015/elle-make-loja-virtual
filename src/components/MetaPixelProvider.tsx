import { useMetaFbclid } from "@/hooks/useMetaFbclid";
import { useMetaPageView } from "@/hooks/useMetaPageView";
import { useMetaAdvancedMatching } from "@/hooks/useMetaAdvancedMatching";

/**
 * Combines all Meta Pixel hooks in one component.
 * Must be rendered inside <BrowserRouter>.
 */
const MetaPixelProvider = () => {
  useMetaFbclid();        // Phase 1: fbc persistence
  useMetaPageView();       // PageView on route change
  useMetaAdvancedMatching(); // Phase 2: Advanced Matching with PII
  return null;
};

export default MetaPixelProvider;
