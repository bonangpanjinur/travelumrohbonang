import { Link } from "react-router-dom";
import { BrandingSettings } from "./adminMenuConfig";

interface AdminBrandingProps {
  branding: BrandingSettings;
  isMobile?: boolean;
}

const AdminBranding = ({ branding, isMobile = false }: AdminBrandingProps) => {
  const showLogo = branding.display_mode === "logo_only" || branding.display_mode === "both";
  const showText = branding.display_mode === "text_only" || branding.display_mode === "both";

  const logoSize = isMobile ? "w-8 h-8" : "w-10 h-10";
  const textSize = isMobile ? "text-lg" : "text-xl";

  return (
    <Link to="/" className="flex items-center gap-2">
      {showLogo && (
        branding.logo_url ? (
          <img 
            src={branding.logo_url} 
            alt={branding.company_name} 
            className={`${isMobile ? "h-8" : "h-10"} w-auto object-contain`}
          />
        ) : (
          <div className={`${logoSize} rounded-full gradient-gold flex items-center justify-center`}>
            <span className={`font-display font-bold ${isMobile ? "text-sm" : "text-lg"} text-primary`}>
              {branding.company_name.charAt(0)}
            </span>
          </div>
        )
      )}
      {showText && (
        <div>
          <span className={`font-display ${textSize} font-bold text-primary-foreground`}>
            {isMobile ? "Admin" : branding.company_name}
          </span>
          <span className="block text-[10px] text-gold-light tracking-widest uppercase -mt-1">
            {isMobile ? "" : "Dashboard"}
          </span>
        </div>
      )}
      {!showText && isMobile && (
        <span className="font-display text-lg font-bold text-primary-foreground">Admin</span>
      )}
    </Link>
  );
};

export default AdminBranding;
