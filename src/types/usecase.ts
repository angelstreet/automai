export type Project = {
  id: string;
  name: string;
  usecases: UseCase[];
};

export type UseCase = {
  id: string;
  shortId: string;
  name: string;
  projectId: string;
  project_id?: string;
  steps: { platform: string; code: string };
  createdAt: string;
  lastModified?: string;
  author?: string;
  status?: string;
  tags?: string[];
};

export type NewUseCase = {
  projectId: string;
  name: string;
  description: string;
  platform: string;
}; 