export const PORTFOLIO_NOTICE =
  "Portfolio project. Use fictional data only. Not for real patient information.";

export function PortfolioNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-center ${className}`}
    >
      <p className="text-xs font-medium leading-snug text-amber-100/95 sm:text-sm">
        {PORTFOLIO_NOTICE}
      </p>
    </div>
  );
}
