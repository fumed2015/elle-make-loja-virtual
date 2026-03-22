import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fbSetUserData } from "./useMetaPixel";

/**
 * Sends user PII to Meta Pixel via Advanced Matching
 * whenever the user is authenticated. This dramatically
 * improves Event Match Quality (EMQ) score.
 *
 * Also sends external_id (user UUID) for deterministic matching.
 */
export function useMetaAdvancedMatching() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fullName = user.user_metadata?.full_name || "";
    const parts = fullName.split(" ");

    // Capture fb_login_id for users who signed in via Facebook OAuth
    const providerIdentities = (user as any).identities || [];
    const fbIdentity = providerIdentities.find((i: any) => i.provider === "facebook");
    const fbLoginId = fbIdentity?.id || user.app_metadata?.providers?.includes("facebook") 
      ? user.user_metadata?.provider_id || "" 
      : "";

    const baseData = {
      email: user.email || "",
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      externalId: user.id,
      fbLoginId: fbLoginId || "",
    };

    // Enrich with profile data (phone, address, birthday, etc.)
    supabase
      .from("profiles")
      .select("phone, address, cpf, birthday")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const addr = (data?.address as any) || {};
        fbSetUserData({
          ...baseData,
          phone: data?.phone || user.user_metadata?.phone || "",
          city: addr.city || "",
          state: addr.state || "",
          zip: addr.zip || addr.cep || "",
          country: "br",
          dateOfBirth: data?.birthday || user.user_metadata?.birthday || "",
        });
      }, () => {
        fbSetUserData(baseData);
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
