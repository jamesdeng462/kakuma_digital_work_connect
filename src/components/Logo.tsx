export function Logo({ size = 32, withText = true, light = false }: { size?: number; withText?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#17704f" />
        <circle cx="46" cy="18" r="7" fill="#f0a83a" />
        <path d="M14 46 L26 30 L34 40 L42 32 L52 46 Z" fill="#acdec6" />
        <rect x="12" y="46" width="40" height="5" rx="2.5" fill="#fff" />
      </svg>
      {withText && (
        <span className={`leading-tight ${light ? "text-white" : "text-brand-900"}`}>
          <span className="block text-sm font-extrabold tracking-tight">Kakuma Digital</span>
          <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">Work Connect</span>
        </span>
      )}
    </span>
  );
}
