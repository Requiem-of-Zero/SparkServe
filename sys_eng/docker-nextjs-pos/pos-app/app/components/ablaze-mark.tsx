import Image from "next/image";

type AblazeMarkProps = {
  className?: string;
};

// Shared Ablaze mark. The logo image is referenced directly here, while CSS
// adds the small glow/spark motion around the actual artwork.
export function AblazeMark({ className = "" }: AblazeMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`ablaze-mark relative inline-flex h-10 w-10 items-center justify-center ${className}`}
    >
      <Image
        src="/brand/ablaze-logo-transparent.png"
        alt=""
        fill
        sizes="40px"
        className="ablaze-mark-image"
      />
      <span className="ablaze-sparkle ablaze-sparkle-left" />
      <span className="ablaze-sparkle ablaze-sparkle-right" />
      <span className="ablaze-sparkle ablaze-sparkle-low" />
    </span>
  );
}
