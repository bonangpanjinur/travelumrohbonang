import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Helmet } from "react-helmet-async";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

const Breadcrumbs = ({ items, className = "" }: BreadcrumbsProps) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: `${origin}/` },
      ...items.map((c, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: c.label,
        item: c.href ? `${origin}${c.href}` : undefined,
      })),
    ],
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center gap-1 text-sm text-muted-foreground ${className}`}
      >
        <Link to="/" className="flex items-center hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
          <span className="sr-only">Beranda</span>
        </Link>
        {items.map((item, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {item.href && idx < items.length - 1 ? (
              <Link to={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
};

export default Breadcrumbs;
