'use client';

import { useState } from 'react';
import type { UploadResult } from '@repo/types';
import { FileUpload } from './file-upload';

type Props = {
  currentAvatar?: string | null;
  onUpload: (file: UploadResult) => void;
};

export function AvatarUpload({ currentAvatar, onUpload }: Props): JSX.Element {
  const [preview, setPreview] = useState<string | null>(currentAvatar ?? null);

  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <div>
        {preview ? (
          <img
            src={preview}
            alt="avatar"
            style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#e5e7eb' }} />
        )}
      </div>
      <FileUpload
        variant="image"
        accept={['image/jpeg', 'image/png', 'image/webp']}
        maxFiles={1}
        onUpload={(files) => {
          if (files[0]) {
            setPreview(files[0].url);
            onUpload(files[0]);
          }
        }}
      />
    </section>
  );
}
