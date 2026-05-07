'use client';

import { useMemo, useRef, useState } from 'react';
import type { UploadResult } from '@repo/types';
import { api } from '@/lib/api';

type Variant = 'image' | 'file';
type FileStatus = 'idle' | 'uploading' | 'success' | 'error';

type UploadFile = {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: FileStatus;
  error?: string;
  result?: UploadResult;
};

type Props = {
  variant: Variant;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  useMediaLibrary?: boolean;
  onUpload: (files: UploadResult[]) => void;
};

export function FileUpload({
  variant,
  accept = [],
  maxSize = 10 * 1024 * 1024,
  maxFiles = 5,
  useMediaLibrary = false,
  onUpload,
}: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const accepted = useMemo(() => accept.join(','), [accept]);

  async function ensureMediaLibraryAvailable(): Promise<boolean> {
    if (!useMediaLibrary) {
      return false;
    }
    try {
      const response = await api.get('/media/status');
      return Boolean(response.data?.data?.installed ?? response.data?.installed);
    } catch {
      return false;
    }
  }

  function pickFiles(): void {
    void ensureMediaLibraryAvailable().then(() => {
      inputRef.current?.click();
    });
  }

  async function uploadSingle(item: UploadFile): Promise<void> {
    const formData = new FormData();
    formData.append('file', item.file);
    const endpoint = variant === 'image' ? '/upload/image' : '/upload/file';

    try {
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const total = event.total ?? item.file.size;
          const progress = Math.min(100, Math.round((event.loaded / total) * 100));
          setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, progress } : row)));
        },
      });
      const result = (response.data?.data ?? response.data) as UploadResult;
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, progress: 100, status: 'success', result } : row,
        ),
      );
    } catch {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, status: 'error', error: 'Upload failed. Please retry.' }
            : row,
        ),
      );
    }
  }

  function onFileChange(fileList: FileList | null): void {
    if (!fileList) {
      return;
    }

    const files = Array.from(fileList);
    if (files.length + items.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    const prepared: UploadFile[] = [];
    for (const file of files) {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large.`);
        continue;
      }
      if (accept.length > 0) {
        const matches = accept.some((item) => file.type === item || file.name.endsWith(item));
        if (!matches) {
          setError(`File type not allowed: ${file.name}`);
          continue;
        }
      }
      prepared.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        progress: 0,
        status: 'uploading',
      });
    }

    if (prepared.length === 0) {
      return;
    }

    setError(null);
    setItems((prev) => [...prev, ...prepared]);

    void Promise.all(prepared.map((item) => uploadSingle(item))).then(() => {
      setItems((current) => {
        const done = current
          .filter((entry) => entry.status === 'success' && entry.result)
          .map((entry) => entry.result!);
        onUpload(done);
        return current;
      });
    });
  }

  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <button type="button" onClick={pickFiles}>
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={accepted}
        style={{ display: 'none' }}
        onChange={(event) => onFileChange(event.target.files)}
      />
      {error ? <small style={{ color: '#b91c1c' }}>{error}</small> : null}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((item) => (
          <article key={item.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }}
                  />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 6, background: '#f3f4f6' }} />
                )}
                <div>
                  <p style={{ margin: 0 }}>{item.file.name}</p>
                  <small>{Math.round(item.file.size / 1024)} KB</small>
                </div>
              </div>
              <strong>{item.status}</strong>
            </div>
            <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: '#e5e7eb' }}>
              <div
                style={{
                  width: `${item.progress}%`,
                  height: '100%',
                  background: '#2563eb',
                  borderRadius: 999,
                }}
              />
            </div>
            {item.error ? <small style={{ color: '#b91c1c' }}>{item.error}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
