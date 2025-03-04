import * as React from 'react';

import { UsePinInputProps } from './types';

export const usePinInput = ({
  value,
  defaultValue,
  type,
  length,
  readOnly,
}: UsePinInputProps) => {
  const pinInputs = React.useMemo(
    () =>
      Array.from({ length }, (_, index) =>
        defaultValue ? defaultValue.charAt(index) : value ? value.charAt(index) : '',
      ),
    [defaultValue, length, value],
  );

  const [pins, setPins] = React.useState<string[]>(pinInputs);
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);
  const refMap = React.useRef<Map<number, HTMLInputElement>>(new Map());

  React.useEffect(() => {
    if (value === undefined) return;
    const nextPins = value.split('');
    setPins(nextPins);
  }, [value]);

  const pinValue = React.useMemo(() => pins.join(''), [pins]);

  function getMap() {
    return refMap.current;
  }

  function getNode(_index: number) {
    const map = getMap();
    return map.get(_index);
  }

  function focusInput(itemId: number) {
    const node = getNode(itemId);
    if (node) {
      node.focus();
    }
  }

  function handleFocus(event: React.FocusEvent<HTMLInputElement>, _index: number) {
    event.target.select();
    setFocusedIndex(_index);
  }

  function handleBlur(_index: number) {
    setFocusedIndex(-1);
  }

  function updateInputField(val: string, _index: number) {
    const nextPins = [...pins];
    nextPins[_index] = val;
    setPins(nextPins);

    // auto focus next pin field
    if (val !== '' && _index < length - 1) {
      focusInput(_index + 1);
    }
  }

  function validate(value: string) {
    if (type === 'numeric') {
      return /^\d*$/.test(value);
    }
    return true;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, _index: number) {
    if (readOnly) return;
    const val = e.target.value;
    const nextVal = val.trim().slice(-1);

    if (nextVal === '' || validate(nextVal)) {
      updateInputField(nextVal, _index);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    if (readOnly) return;
    event.preventDefault();
    const val = event.clipboardData.getData('text').trim();
    if (!validate(val)) return;

    const nextPins = [...pins];
    const pastedChars = val.split('');
    let currentIndex = focusedIndex;

    for (let i = 0; i < pastedChars.length; i++) {
      if (currentIndex >= length) break;
      nextPins[currentIndex] = pastedChars[i];
      currentIndex++;
    }

    setPins(nextPins);
    focusInput(Math.min(currentIndex, length - 1));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, _index: number) {
    if (readOnly) return;
    const key = event.key;

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      event.preventDefault();
      focusInput(_index - 1);
    }

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      event.preventDefault();
      focusInput(_index + 1);
    }

    if (key === 'Delete') {
      event.preventDefault();
      const nextPins = [...pins];
      nextPins[_index] = '';
      setPins(nextPins);
    }

    if (key === 'Backspace') {
      event.preventDefault();
      const nextPins = [...pins];
      nextPins[_index] = '';
      setPins(nextPins);
      if (_index > 0) {
        focusInput(_index - 1);
      }
    }

    if (key === 'Escape') {
      event.preventDefault();
      const node = getNode(_index);
      if (node) {
        node.blur();
      }
    }

    if (key === 'Tab') {
      // Allow normal tab behavior
      return;
    }

    if (key === ' ') {
      event.preventDefault();
      return;
    }
  }

  return {
    pins,
    pinValue,
    refMap: refMap.current,
    handleChange,
    handleFocus,
    handleBlur,
    handleKeyDown,
    handlePaste,
  };
};
