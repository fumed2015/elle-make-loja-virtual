import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { refreshMetaUserDataFromAuth } from "./useMetaUserData";

/**
 * Loads user PII from auth + profile into the centralized Meta user data store.
 * This runs on auth state change and persists data to localStorage so
 * ALL subsequent events (PageView, ViewContent, etc.) include full PII.
 */
export function useMetaAdvancedMatching() {
  const { user } = useAuth();

  useEffect(() => {
    // Refresh user data from auth — works for both logged-in and anonymous
    // For anonymous users, it just returns whatever is in localStorage
    refreshMetaUserDataFromAuth();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
