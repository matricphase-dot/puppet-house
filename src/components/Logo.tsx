export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`} aria-label="Puppet House">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 38 38" fill="none"><path d="M8 30V16L19 7l11 9v14H8Z" stroke="currentColor" strokeWidth="2.4"/><path d="M14 30v-8h10v8M19 7V2M13 3h12" stroke="currentColor" strokeWidth="2.4"/><circle cx="15" cy="16" r="1.5" fill="currentColor"/><circle cx="23" cy="16" r="1.5" fill="currentColor"/></svg>
      </span>
      <span className="brand-type">PUPPET<span>HOUSE</span></span>
    </div>
  );
}
