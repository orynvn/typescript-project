'use client';

import { useState } from 'react';
import type { UploadResult } from '@repo/types';
import { AppImage } from '@/components/common/app-image';
import { FileUpload } from '@/components/upload/file-upload';

export default function ProfilePage(): JSX.Element {
  const [avatar, setAvatar] = useState<string | null>(null);

  return (
    <section>
      <h1>Profile</h1>
      <p>Profile + avatar upload (useMediaLibrary=false) scaffold.</p>
      <div style={{ margin: '12px 0' }}>
        {avatar ? (
          <AppImage src={avatar} alt="avatar" width={80} height={80} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e5e7eb' }} />
        )}
      </div>
      <FileUpload
        variant="image"
        onUpload={(files: UploadResult[]) => {
          if (files[0]) {
            setAvatar(files[0].url);
          }
        }}
      />
    </section>
  );
}
