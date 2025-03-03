import * as React from 'react';

import { cn } from '@/lib/utils';

// Context
export const PinInputContext = React.createContext<boolean>(false);

// Types
export interface PinInputProps {
  children: React.ReactElement<typeof PinInputField> | React.ReactElement<typeof PinInputField>[];
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  onIncomplete?: (value: string) => void;
  placeholder?: string;
  type?: 'numeric' | 'alphanumeric';
  name?: string;
  form?: string;
  otp?: boolean;
  mask?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
}

export interface PinInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask?: boolean;
  inputKey?: string;
  name?: string;
}

export interface UsePinInputProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: 'numeric' | 'alphanumeric';
  length: number;
  readOnly?: boolean;
}

// Utilities
export function getValidChildren(children: React.ReactNode) {
  return React.Children.toArray(children).filter((child) =>
    React.isValidElement(child),
  ) as React.ReactElement[];
}

export function getInputFieldCount(children: React.ReactNode) {
  return React.Children.toArray(children).filter((child) => {
    return React.isValidElement(child) && 
      typeof child.type === 'function' && 
      'displayName' in child.type && 
      child.type.displayName === 'PinInputField';
  }).length;
}

// Hook
export const usePinInput = ({
  value,
  defaultValue,
  placeholder,
  type,
  length,
  readOnly,
}: UsePinInputProps) => {
  const pinInputs = React.useMemo(() => Array.from({ length }, (_, i) => i), [length]);

  const [pins, setPins] = React.useState<string[]>(pinInputs.map(() => ''));
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);
  const refMap = React.useRef<Map<number, HTMLInputElement>>(new Map());

  const pinValue = React.useMemo(() => pins.join(''), [pins]);

  React.useEffect(() => {
    if (value !== undefined) {
      const valueArray = value.split('');
      setPins(pinInputs.map((_, i) => valueArray[i] || ''));
    }
  }, [value, pinInputs]);

  React.useEffect(() => {
    if (defaultValue !== undefined && value === undefined) {
      const defaultValueArray = defaultValue.split('');
      setPins(pinInputs.map((_, i) => defaultValueArray[i] || ''));
    }
  }, [defaultValue, pinInputs, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (readOnly) return;

    const newValue = e.target.value;
    const newPins = [...pins];

    if (type === 'numeric' && !/^\d*$/.test(newValue)) {
      return;
    }

    if (newValue.length <= 1) {
      newPins[index] = newValue;
      setPins(newPins);

      if (newValue.length === 1 && index < length - 1) {
        const nextInput = refMap.current.get(index + 1);
        if (nextInput) {
          nextInput.focus();
        }
      }
    } else if (newValue.length > 1) {
      // Handle paste or multiple characters
      const newChars = newValue.split('');
      for (let i = 0; i < newChars.length && index + i < length; i++) {
        newPins[index + i] = newChars[i];
      }
      setPins(newPins);

      const nextIndex = Math.min(index + newChars.length, length - 1);
      const nextInput = refMap.current.get(nextIndex);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (readOnly) return;

    if (e.key === 'Backspace' && !pins[index] && index > 0) {
      const newPins = [...pins];
      newPins[index - 1] = '';
      setPins(newPins);

      const prevInput = refMap.current.get(index - 1);
      if (prevInput) {
        prevInput.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = refMap.current.get(index - 1);
      if (prevInput) {
        prevInput.focus();
      }
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      const nextInput = refMap.current.get(index + 1);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>, index: number) => {
    e.target.select();
    setFocusedIndex(index);
  };

  const handleBlur = (index: number) => {
    setFocusedIndex(-1);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (readOnly) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();

    if (type === 'numeric' && !/^\d*$/.test(pastedData)) {
      return;
    }

    const pastedChars = pastedData.split('');
    const newPins = [...pins];

    for (let i = 0; i < pastedChars.length && i < length; i++) {
      newPins[i] = pastedChars[i];
    }

    setPins(newPins);

    const lastFilledIndex = Math.min(pastedChars.length - 1, length - 1);
    const nextInput = refMap.current.get(lastFilledIndex);
    if (nextInput) {
      nextInput.focus();
    }
  };

  return {
    pins,
    pinValue,
    focusedIndex,
    refMap: refMap.current,
    handleChange,
    handleKeyDown,
    handleFocus,
    handleBlur,
    handlePaste,
  };
};

// PinInputField Component
export const PinInputField = React.forwardRef<HTMLInputElement, PinInputFieldProps>(
  ({ className, mask, type, inputKey, ...props }, ref) => {
    // Check if PinInputField is used within PinInput
    const isInsidePinInput = React.useContext(PinInputContext);

    if (!isInsidePinInput) {
      console.warn('PinInputField must be used within PinInput');
    }

    return (
      <input
        ref={ref}
        type={mask ? 'password' : 'text'}
        className={cn(
          'flex h-10 w-10 rounded-md border border-input bg-background px-3 py-2 text-center text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        maxLength={1}
        {...props}
      />
    );
  },
);

PinInputField.displayName = 'PinInputField';

// PinInput Component
export const PinInput = React.forwardRef<HTMLDivElement, PinInputProps>(
  ({ className, children, ...props }, ref) => {
    const {
      defaultValue,
      value,
      onChange,
      onComplete,
      onIncomplete,
      placeholder = '○',
      type = 'alphanumeric',
      name,
      form,
      otp = false,
      mask = false,
      disabled = false,
      readOnly = false,
      autoFocus = false,
      ariaLabel = '',
      ...rest
    } = props;

    const validChildren = getValidChildren(children);
    const length = getInputFieldCount(children);
    const { pins, pinValue, refMap, ...handlers } = usePinInput({
      value,
      defaultValue,
      placeholder,
      type,
      length,
      readOnly,
    });

    React.useEffect(() => {
      if (!onChange) return;
      onChange(pinValue);
    }, [onChange, pinValue]);

    React.useEffect(() => {
      if (pinValue.length === length && onComplete) {
        onComplete(pinValue);
      }
      if (pinValue.length !== length && onIncomplete) {
        onIncomplete(pinValue);
      }
    }, [length, onComplete, onIncomplete, pinValue]);

    React.useEffect(() => {
      if (!autoFocus) return;
      const node = refMap?.get(0);
      if (node) {
        node.focus();
      }
    }, [autoFocus, refMap]);

    const clones = validChildren.map((child, index) => {
      if (React.isValidElement(child) && child.type === PinInputField) {
        return React.cloneElement(child, {
          name,
          inputKey: `input-${index}`,
          value: length > index ? pins[index] : '',
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => handlers.handleChange(e, index),
          onFocus: (e: React.FocusEvent<HTMLInputElement>) => handlers.handleFocus(e, index),
          onBlur: () => handlers.handleBlur(index),
          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => handlers.handleKeyDown(e, index),
          onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => handlers.handlePaste(e),
          placeholder: placeholder,
          type: type,
          mask: mask,
          autoComplete: otp ? 'one-time-code' : 'off',
          disabled: disabled,
          readOnly: readOnly,
          'aria-label': ariaLabel ? ariaLabel : `Pin input ${index + 1} of ${length}`,
          ref: (node: HTMLInputElement | null) => {
            if (node) {
              refMap?.set(index, node);
            } else {
              refMap?.delete(index);
            }
          },
        } as React.HTMLAttributes<HTMLInputElement> & PinInputFieldProps);
      }
      return child;
    });

    return (
      <PinInputContext.Provider value={true}>
        <div ref={ref} aria-label="Pin Input" className={cn('flex gap-2', className)} {...rest}>
          {clones}
          <input type="hidden" name={name} form={form} value={pinValue} />
        </div>
      </PinInputContext.Provider>
    );
  },
);

PinInput.displayName = 'PinInput';
