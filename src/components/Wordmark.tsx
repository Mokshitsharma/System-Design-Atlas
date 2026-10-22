/** Plain text logo. A small blue square of connected nodes marks it without a separate mascot or icon. */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-bold text-ink">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="1" y="1" width="18" height="18" rx="3" fill="var(--blue)" />
        <path d="M5.5 14.5 L10 10 L14.5 5.5" stroke="#fff" strokeWidth="1.6" fill="none" />
        <circle cx="5.5" cy="14.5" r="1.9" fill="#fff" /><circle cx="10" cy="10" r="1.9" fill="#fff" /><circle cx="14.5" cy="5.5" r="1.9" fill="#fff" />
      </svg>
      <span className="hidden sm:inline">System Design Atlas</span>
    </span>
  );
}
