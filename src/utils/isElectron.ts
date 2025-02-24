export const isElectron = (): boolean => {
  if (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    window.process.type === 'renderer'
  ) {
    return true;
  }
  return false;
};

export default isElectron;
