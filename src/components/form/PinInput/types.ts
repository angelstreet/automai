import * as React from 'react';

export interface PinInputProps {
  children: React.ReactElement<typeof PinInputField> | React.ReactElement<typeof PinInputField>[];
  /**
   * className for the input container
   */
  className?: string;
  /**
   * `aria-label` for the input fields
   */
  ariaLabel?: string;
  /**
   * If set, the pin input receives focus on mount, `false` by default
   */
  autoFocus?: boolean;
  /**
   * Called when value changes
   */
  onChange?: (value: string) => void;
  /**
   * Called when all inputs have valid value
   */
  onComplete?: (value: string) => void;
  /**
   * Called when any input doesn't have value
   */
  onIncomplete?: (value: string) => void;
  /**
   * `name` attribute for input fields
   */
  name?: string;
  /**
   * `form` attribute for hidden input
   */
  form?: string;
  /**
   * If set, the input's value will be masked just like password input. This field is `false` by default
   */
  mask?: boolean;
  /**
   * If set, the pin input component signals to its fields that they should
   * use `autocomplete="one-time-code"`. This field is `false` by default
   */
  otp?: boolean;
  /**
   * Uncontrolled pin input default value.
   */
  defaultValue?: string;
  /**
   * Controlled pin input value.
   */
  value?: string;
  /**
   * The type of value pin input should allow, `alphanumeric` by default
   */
  type?: 'numeric' | 'alphanumeric';
  /**
   * Placeholder for input fields, `○` by default
   */
  placeholder?: string;
  /**
   * If set, the user cannot set the value, `false` by default
   */
  readOnly?: boolean;
  /**
   * If set, the input fields are disabled, `false` by default
   */
  disabled?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

export interface _PinInputFieldProps {
  mask: boolean;
  inputKey: string;
  type: 'numeric' | 'alphanumeric';
}

export interface PinInputFieldProps<T>
  extends Omit<React.ComponentPropsWithoutRef<'input'>, keyof _PinInputFieldProps> {
  component?: T;
}

export interface UsePinInputProps {
  value: string | undefined;
  defaultValue: string | undefined;
  placeholder: string;
  type: 'numeric' | 'alphanumeric';
  length: number;
  readOnly: boolean;
}

// This is a forward reference to avoid circular dependency
// The actual PinInputField component will be defined in PinInputField.tsx
export const PinInputField: any = null;
