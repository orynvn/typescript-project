'use client';

import { useRef, useState } from 'react';
import type { UploadResult } from '@repo/types';

type Props = {
  variant: 'image' | 'file';
  onUpload: (files: UploadResult[]) => void;
};

export function FileUpload({ variant, onUpload }: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFiles(fileList: FileList | null): Promise<void> {
    if (!fileList?.length) {
      return;
    }
    setUploading(true);
    const endpoint = variant === 'image' ? '/api/upload/image' : '/api/upload/file';
    const results: UploadResult[] = [];

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(endpoint, { method: 'POST', body: formData });
      const json = await response.json();
      results.push((json.data ?? json) as UploadResult);
    }

    onUpload(results);
    setUploading(false);
  }

  return (
    <section>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Choose file'}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(event) => {
          void onFiles(event.target.files);
        }}
      />
    </section>
  );
}
