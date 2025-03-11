import * as React from 'react';

/**
 * Get valid children from React children
 */
export const _getValidChildren = (children: React.ReactNode) =>
  React.Children.toArray(children).filter((child) => {
    return React.isValidElement(child);
  });

/**
 * Get the count of PinInputField components
 */
export const _getInputFieldCount = (children: React.ReactNode) =>
  React.Children.toArray(children).filter((child) => {
    return (
      React.isValidElement(child) &&
      typeof child.type === 'function' &&
      (child.type as any).name === 'PinInputField'
    );
  }).length;
