/**
 * SchemePortalLink: the official-portal footer line of the scheme panels — a
 * new-tab link whose behaviour is announced to screen readers through the
 * sr-only suffix (target="_blank" alone is silent).
 */
export interface SchemePortalLinkProps {
  /** Lead-in text, e.g. "Apply on the official portal:". */
  prefix: string;
  href: string;
  /** Visible link text, e.g. "pmsuryaghar.gov.in". */
  label: string;
}

export function SchemePortalLink({
  prefix,
  href,
  label,
}: SchemePortalLinkProps): React.JSX.Element {
  return (
    <p className="m-0 mt-4 text-sm">
      {prefix}{' '}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary underline"
      >
        {label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}
