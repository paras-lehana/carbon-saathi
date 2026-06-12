/**
 * Presentation-only list for calculator-generated tips, shared by the
 * dashboard tips card and the onboarding result reveal so the two renderings
 * can never drift apart. Callers own the surrounding card and heading.
 */

export interface TipsListProps {
  tips: readonly string[];
}

export function TipsList({ tips }: TipsListProps): React.JSX.Element {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {tips.map((tip) => (
        <li key={tip} className="flex items-start gap-2 text-sm">
          <span aria-hidden="true" className="mt-0.5 text-primary">
            ✓
          </span>
          {tip}
        </li>
      ))}
    </ul>
  );
}
