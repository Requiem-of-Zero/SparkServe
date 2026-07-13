type EmberMarkProps = {
  className?: string;
};

// Shared Ember mark. The flame itself comes from the actual brand image, while
// the small CSS sparkles add motion without distorting the logo artwork.
export function EmberMark({ className = "" }: EmberMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`ember-mark relative inline-flex h-10 w-10 items-center justify-center ${className}`}
    >
      <span className="ember-mark-image" />
      <span className="ember-sparkle ember-sparkle-left" />
      <span className="ember-sparkle ember-sparkle-right" />
      <span className="ember-sparkle ember-sparkle-low" />
    </span>
  );
}
