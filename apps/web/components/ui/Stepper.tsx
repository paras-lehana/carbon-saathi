/**
 * Stepper: accessible multi-step wizard header. Pure presentation — the
 * wizard owns step state; this only renders position (aria-current="step"
 * marks the active one, completed steps get a check).
 */

export interface StepperProps {
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps): React.JSX.Element {
  return (
    <ol role="list"
      aria-label="Progress"
      className={['m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0', className]
        .filter(Boolean)
        .join(' ')}
    >
      {steps.map((step, index) => {
        const isCurrent = index === current;
        const isDone = index < current;
        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className={`flex items-center gap-2 text-sm ${
              isCurrent ? 'font-semibold text-primary' : isDone ? 'text-ink' : 'text-ink-muted'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                isCurrent
                  ? 'border-primary bg-primary text-on-primary'
                  : isDone
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-line bg-surface text-ink-muted'
              }`}
            >
              {isDone ? '✓' : index + 1}
            </span>
            <span>
              {step}
              {/* Visually the check conveys completion; say it for AT too. */}
              {isDone && <span className="sr-only"> (completed)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
