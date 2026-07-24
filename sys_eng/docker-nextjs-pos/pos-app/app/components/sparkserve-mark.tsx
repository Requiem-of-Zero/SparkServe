import Image from "next/image";

type SparkServeMarkProps = {
  className?: string;
};

// Shared SparkServe mark. The logo image is referenced directly here, while CSS
// adds the small glow/spark motion around the actual artwork.
export function SparkServeMark({ className = "" }: SparkServeMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`sparkserve-mark relative inline-flex h-10 w-10 items-center justify-center ${className}`}
    >
      <Image
        src="/brand/sparkserve-logo-transparent.png"
        alt=""
        fill
        sizes="40px"
        className="sparkserve-mark-image"
      />
      <span className="sparkserve-sparkle sparkserve-sparkle-left" />
      <span className="sparkserve-sparkle sparkserve-sparkle-right" />
      <span className="sparkserve-sparkle sparkserve-sparkle-low" />
    </span>
  );
}
