import {
  CICDBuild,
  CICDJob,
  CICDJobParameter,
  CICDProvider,
  CICDProviderConfig,
  CICDPipelineConfig,
} from '@/types/service/cicdServiceTypes';

// Response type for service methods
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// CICD specific response type
export interface CICDResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type {
  CICDBuild,
  CICDJob,
  CICDJobParameter,
  CICDProvider,
  CICDProviderConfig,
  CICDPipelineConfig,
};
