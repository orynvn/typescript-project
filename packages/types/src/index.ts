export type AppHealth = {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks?: Record<string, { status: 'up' | 'down'; latencyMs?: number }>;
};

export type UploadResult = {
  id: string;
  url: string;
  key: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
};
