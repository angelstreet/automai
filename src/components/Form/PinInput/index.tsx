import * as React from 'react';
import { PinInputProps } from './Types';
import { PinInputContext } from './Context';
import { usePinInput } from './usePinInput';
import { getValidChildren, getInputFieldCount } from './Utils';
import { PinInputField as PinInputFieldComponent } from './PinInputField';

export const PinInputField = PinInputFieldComponent;

export const PinInput = ({ className, children, ref, ...props }: PinInputProps) => {
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

  // pins, pinValue, refMap, ...handlers
  const { pins, pinValue, refMap, ...handlers } = usePinInput({
    value,
    defaultValue,
    placeholder,
    type,
    length,
    readOnly,
  });

  /* call onChange func if pinValue changes */
  React.useEffect(() => {
    if (!onChange) return;
    onChange(pinValue);
  }, [onChange, pinValue]);

  /* call onComplete/onIncomplete func if pinValue is valid and completed/incompleted */
  const completeRef = React.useRef(pinValue.length === length);
  React.useEffect(() => {
    if (pinValue.length === length && completeRef.current === false) {
      completeRef.current = true;
      if (onComplete) onComplete(pinValue);
    }
    if (pinValue.length !== length && completeRef.current === true) {
      completeRef.current = false;
      if (onIncomplete) onIncomplete(pinValue);
    }
  }, [length, onComplete, onIncomplete, pinValue, pins, value]);

  /* focus on first input field if autoFocus is set */
  React.useEffect(() => {
    if (!autoFocus) return;
    const node = refMap?.get(0);
    if (node) {
      node.focus();
    }
  }, [autoFocus, refMap]);

  const skipRef = React.useRef(0);
  let counter = 0;
  const clones = validChildren.map((child) => {
    if (child.type === PinInputFieldComponent) {
      const pinIndex = counter;
      counter = counter + 1;
      return React.cloneElement(child, {
        name,
        inputKey: `input-${pinIndex}`,
        value: length > pinIndex ? pins[pinIndex] : '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => handlers.handleChange(e, pinIndex),
        onFocus: (e: React.FocusEvent<HTMLInputElement>) => handlers.handleFocus(e, pinIndex),
        onBlur: () => handlers.handleBlur(pinIndex),
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) =>
          handlers.handleKeyDown(e, pinIndex),
        onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => handlers.handlePaste(e),
        placeholder: placeholder,
        type: type,
        mask: mask,
        autoComplete: otp ? 'one-time-code' : 'off',
        disabled: disabled,
        readOnly: readOnly,
        'aria-label': ariaLabel ? ariaLabel : `Pin input ${counter} of ${length}`,
        ref: (node: HTMLInputElement | null) => {
          if (node) {
            refMap?.set(pinIndex, node);
          } else {
            refMap?.delete(pinIndex);
          }
        },
      });
    }
    skipRef.current = skipRef.current + 1;
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

// Export everything
export * from './Types';
export * from './Context';
export * from './usePinInput';
export * from './Utils';
