import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/shared/integrations/supabase/client";
import { setAffiliateCookie, trackAffiliateClick } from "@/features/agent/lib/affiliate";

const AffiliateRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [search] = useSearchParams();

  useEffect(() => {
    const run = async () => {
      if (!code) {
        navigate("/", { replace: true });
        return;
      }
      const { data } = await supabase
        .from("agents_public" as any)
        .select("id, is_active")
        .eq("referral_code", code)
        .maybeSingle();

      const agent = data as { id: string; is_active: boolean } | null;
      if (agent?.is_active) {
        setAffiliateCookie(code);
        const landing = search.get("to") || "/";
        await trackAffiliateClick(agent.id, code, landing);
        navigate(landing, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };
    run();
  }, [code, navigate, search]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
};

export default AffiliateRedirect;
