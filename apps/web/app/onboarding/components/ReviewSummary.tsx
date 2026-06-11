/**
 * Review step: a read-only summary of every survey answer so users can
 * confirm before the calculation. Pure presentation over the form state.
 */
import {
  CAR_MODES,
  COMMUTE_MODE_OPTIONS,
  DIET_OPTIONS,
  SHOPPING_OPTIONS,
  optionLabel,
  type SurveyFormState,
} from './survey-form';

export interface ReviewSummaryProps {
  form: SurveyFormState;
}

export function ReviewSummary({ form }: ReviewSummaryProps): React.JSX.Element {
  const electricity =
    form.electricityInputKind === 'kwh'
      ? `${form.monthlyElectricityValue} kWh / month`
      : `₹${form.monthlyElectricityValue} bill / month`;
  const commute = `${optionLabel(COMMUTE_MODE_OPTIONS, form.commuteMode)} · ${form.commuteKmOneWay} km one-way · ${form.commuteDaysPerWeek} days/week`;
  const rows: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Household size', value: `${form.householdSize} people` },
    { label: 'Electricity', value: electricity },
    { label: 'LPG cylinders', value: `${form.lpgCylindersPerMonth} / month` },
    { label: 'AC hours', value: `${form.acHoursPerDay} hours / day` },
    { label: 'Commute', value: commute },
    ...(CAR_MODES.includes(form.commuteMode)
      ? [{ label: 'Car sharing', value: `${form.carpoolSize} people` }]
      : []),
    {
      label: 'Flights per year',
      value: `${form.flightsShortPerYear} short · ${form.flightsLongPerYear} long`,
    },
    { label: 'Diet', value: optionLabel(DIET_OPTIONS, form.dietPattern) },
    { label: 'Shopping', value: optionLabel(SHOPPING_OPTIONS, form.shoppingLevel) },
    ...(form.stateName.trim() !== '' ? [{ label: 'State', value: form.stateName.trim() }] : []),
    ...(form.displayName.trim() !== ''
      ? [{ label: 'Display name', value: form.displayName.trim() }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="m-0 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {row.label}
            </dt>
            <dd className="m-0 text-sm font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-xs text-ink-muted">
        Your answers never leave this device as a profile — the calculator returns only your
        footprint numbers.
      </p>
    </div>
  );
}
