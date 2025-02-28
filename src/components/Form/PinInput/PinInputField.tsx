import * as React from 'react';

import { cn } from '@/lib/utils';

import { PinInputContext } from './Context';
import { PinInputFieldProps, _PinInputFieldProps } from './Types';

export const PinInputField = <T extends React.ElementType = 'input'>({
  className,
  component,
  ...props
}: PinInputFieldProps<T> &
  (React.ComponentType<T> extends undefined ? never : React.ComponentProps<T>)) => {
  const { mask, type, inputKey, ...rest } = props as _PinInputFieldProps & React.ComponentProps<T>;

  // Check if PinInputField is used within PinInput
  const isInsidePinInput = React.useContext(PinInputContext);
  if (!isInsidePinInput) {
    throw new Error(`PinInputField must be used within PinInput.`);
  }

  const Element = component || 'input';

  return (
    <Element
      key={inputKey}
      type={mask ? 'password' : type === 'numeric' ? 'tel' : 'text'}
      inputMode={type === 'numeric' ? 'numeric' : 'text'}
      className={cn('size-10 text-center', className)}
      {...rest}
    />
  );
};
