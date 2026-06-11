/**
 * SkipLink: first focusable element on every page — lets keyboard users jump
 * past the header straight to <main id="main-content"> (WCAG 2.4.1).
 */

export function SkipLink(): React.JSX.Element {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}
