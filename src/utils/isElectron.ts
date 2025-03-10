export const isElectron = (): boolean => {
  if (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    (window.process as any).type === 'renderer'
  ) {
    return true;
  }
  return false;
};

export default isElectron;
