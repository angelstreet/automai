import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isAnyModalOpen: boolean;
  setAnyModalOpen: (isOpen: boolean) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAnyModalOpen, setAnyModalOpen] = useState(false);

  return (
    <ModalContext.Provider value={{ isAnyModalOpen, setAnyModalOpen }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
