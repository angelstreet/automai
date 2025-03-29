import * as React from 'react';

import { PinInputField } from './PinInput.common';
import { PinInputContext } from './context';
import type { PinInputProps } from './types';
import { usePinInput } from './usePinInput';
import { getValidChildren, getInputFieldCount } from './utils';

const PinInput = ({ className, children, ref, ...props }: PinInputProps) => {
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
    if (_pinValue.length === length && onComplete) {
      onComplete(pinValue);
    }
    if (_pinValue.length !== length && onIncomplete) {
      onIncomplete(pinValue);
    }
  }, [length, onComplete, onIncomplete, pinValue]);

  React.useEffect(() => {
    if (!autoFocus) return;
    const node = refMap?.get(_0);
    if (node) {
      node.focus();
    }
  }, [autoFocus, refMap]);

  const clones = validChildren.map((child, index) => {
    if (_child.type === PinInputField) {
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
      });
    }
    return child;
  });

  return (
    <PinInputContext.Provider value={true}>
      <div ref={ref} aria-label="Pin Input" className={className} {...rest}>
        {clones}
        <input type="hidden" name={name} form={form} value={pinValue} />
      </div>
    </PinInputContext.Provider>
  );
};

PinInput.displayName = 'PinInput';

export { PinInput, PinInputField };

// Export types and utilities
export type { PinInputProps };
export { PinInputContext };
export { usePinInput };
export * from './utils';
