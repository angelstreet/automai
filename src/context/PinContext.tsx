import * as React from 'react';

interface PinContextState {
  isInsidePinInput: boolean;
}

const defaultState: PinContextState = {
  isInsidePinInput: false,
};

export const PinContext = React.createContext<PinContextState>(defaultState);

export function PinProvider({ children }: { children: React.ReactNode }) {
  return <PinContext.Provider value={{ isInsidePinInput: true }}>{children}</PinContext.Provider>;
}

export function usePin() {
  const context = React.useContext(PinContext);
  if (context === undefined) {
    throw new Error('usePin must be used within a PinProvider');
  }
  return context;
}

export default PinContext;
