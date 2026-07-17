import Link from "next/link";

type RestaurantBrandLinkProps = {
  logoUrl?: string | null;
  name: string;
  animated?: boolean;
  markClassName?: string;
  textClassName?: string;
};

const defaultRestaurantLogoUrl = "/brand/ablaze-logo-transparent.png";

// Public storefront brand. This uses the restaurant's configured name/logo;
// Ablaze stays in the footer as the platform provider.
export function RestaurantBrandLink({
  logoUrl,
  name,
  animated = false,
  markClassName = "h-9 w-9",
  textClassName = "",
}: RestaurantBrandLinkProps) {
  const animationClass = animated ? "restaurant-brand-mark" : "";
  const displayLogoUrl = logoUrl ?? defaultRestaurantLogoUrl;

  return (
    <Link href="/" className="flex min-w-0 items-center gap-3 font-bold">
      <span
        className={`relative flex shrink-0 items-center justify-center ${animationClass} ${markClassName}`}
      >
        {/* Use a regular img so future restaurant GIF logos can animate. */}
        <img
          src={displayLogoUrl}
          alt=""
          className="restaurant-brand-image relative z-10 h-full w-full object-contain"
        />
        {animated ? (
          <>
            <span className="ablaze-sparkle ablaze-sparkle-left" />
            <span className="ablaze-sparkle ablaze-sparkle-right" />
            <span className="ablaze-sparkle ablaze-sparkle-low" />
          </>
        ) : null}
      </span>
      <span className={`truncate ${textClassName}`}>{name}</span>
    </Link>
  );
}
