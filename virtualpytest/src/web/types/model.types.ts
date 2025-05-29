export interface Model {
  id: string;
  name: string;
  types: string[];
  controllers: string[];
  version: string;
  description: string;
}

export type ModelCreateData = Omit<Model, 'id'>;

export const MODEL_TYPES = [
  'Android Phone',
  'Android TV',
  'Android Tablet',
  'iOs Phone',
  'iOs Tablet',
  'Fire TV',
  'Nvidia Shield',
  'Apple TV',
  'STB',
  'Linux',
  'Windows',
  'Tizen TV',
  'LG Tv',
] as const;

export const CONTROLLER_TYPES = [
  'Audio Video Controller',
  'Power Controller',
  'Remote Controller',
  'Network Controller',
] as const;

export type ModelType = typeof MODEL_TYPES[number];
export type ControllerType = typeof CONTROLLER_TYPES[number]; 