import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fbSetUserData } from "./useMetaPixel";

/**
 * Sends user PII to Meta Pixel via Advanced Matching
 * whenever the user is authenticated. This dramatically
 * improves Event Match Quality (EMQ) score.
 */
export function useMetaAdvancedMatching() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fullName = user.user_metadata?.full_name || "";
    const parts = fullName.split(" ");

    // Start with auth data
    const baseData = {
      email: user.email || "",
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
    };

    // Enrich with profile data (phone, address, etc.)
    supabase
      .from("profiles")
      .select("phone, address")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const addr = (data?.address as any) || {};
        fbSetUserData({
          ...baseData,
          phone: data?.phone || user.user_metadata?.phone || "",
          city: addr.city || "",
          state: addr.state || "",
          zip: addr.zip || "",
          country: "br",
        });
      })
      .catch(() => {
        // Fallback: send what we have from auth
        fbSetUserData(baseData);
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
