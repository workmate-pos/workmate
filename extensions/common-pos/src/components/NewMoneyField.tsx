import { BigDecimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { NewDecimalField, NewDecimalFieldProps } from './NewDecimalField.js';
import { InputAction } from '@shopify/retail-ui-extensions';
import { useCurrencyFormatter } from '../hooks/use-currency-formatter.js';

export type NewMoneyFieldProps = {
  value: Money | null;
  onChange?: (value: Money | null) => void;
  onIsValid?: (isValid: boolean) => void;
  preprocessor?: (value: Money | null) => Money | null;
  validator?: (value: Money | null) => string | null;
  postprocessor?: (value: Money | null) => Money | null;
  required?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  // pass-through props
  label: string;
  // TODO: Support min and max
  // min?: number;
  // max?: number;
  disabled?: boolean;
  placeholder?: Money;
  helpText?: string;
  action?: InputAction;
};

export function NewMoneyField(props: NewMoneyFieldProps) {
  const currencyFormatter = useCurrencyFormatter();

  const formatter = (value: Money | null) => (value !== null ? currencyFormatter(value) : null);
  const postprocessor = (value: Money | null) =>
    value !== null ? BigDecimal.fromMoney(value).round(2, RoundingMode.CEILING).toMoney() : null;

  return (
    <NewDecimalField
      {...(props as NewDecimalFieldProps)}
      inputMode={'decimal'}
      formatter={formatter as NewDecimalFieldProps['formatter']}
      postprocessor={postprocessor as NewDecimalFieldProps['postprocessor']}
    />
  );
}
