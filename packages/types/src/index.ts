export type AppHealth = {
  status: 'ok';
  timestamp: string;
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
