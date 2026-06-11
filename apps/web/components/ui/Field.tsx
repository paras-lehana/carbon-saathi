/**
 * Field: form-control wrapper that owns label/hint/error wiring. It clones
 * its single child control, injecting id, aria-describedby and aria-invalid,
 * so every input on the site gets identical, correct a11y plumbing for free.
 */
import { cloneElement, type ReactElement } from 'react';

interface InjectedControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  /** Exactly one input/select/textarea (or compatible custom control). */
  children: ReactElement<InjectedControlProps>;
}

export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FieldProps): React.JSX.Element {
  const hintId = hint !== undefined ? `${id}-hint` : undefined;
  const errorId = error !== undefined ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = cloneElement(children, {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error !== undefined ? true : undefined,
  });

  return (
    <div className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {hint !== undefined && (
        <p id={hintId} className="m-0 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {control}
      {error !== undefined && (
        <p id={errorId} className="m-0 text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
