export type KoreaderProgressPayload = {
  progress: string;
  percentage: number;
  device_id: string;
  document: string;
  device: string;
};

export type KoreaderProgressResponse = Omit<KoreaderProgressPayload, 'percentage'> & {
  percentage: number | null;
  timestamp: number;
};

export type KoreaderAuthHeaders = {
  'X-Auth-User': string;
  'X-Auth-Key': string;
};

export const KOREADER_ACCEPT = 'application/vnd.koreader.v1+json';

export const MIN_PUSH_INTERVAL_MS = 25_000;

export const CONFLICT_PROGRESS_DELTA = 0.02;
