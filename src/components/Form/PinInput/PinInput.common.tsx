import React from 'react';

interface PinInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputKey?: string;
  mask?: boolean;
}

export const PinInputField = React.forwardRef<HTMLInputElement, PinInputFieldProps>(
  ({ className, mask, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={mask ? 'password' : type}
        className={className}
        maxLength={1}
        {...props}
      />
    );
  }
);

PinInputField.displayName = 'PinInputField'; 