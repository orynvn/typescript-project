'use client';

import { useState } from 'react';
import type { UploadResult } from '@repo/types';
import { AvatarUpload } from '@/components/upload/avatar-upload';
import { FileUpload } from '@/components/upload/file-upload';

const stats = [
  { label: 'Total Users', value: 120 },
  { label: 'Active Users', value: 95 },
  { label: 'New This Month', value: 18 },
  { label: 'Revenue', value: '$0' },
];

export default function DashboardPage(): JSX.Element {
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([]);

  return (
    <section>
      <h1>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {stats.map((stat) => (
          <article
            key={stat.label}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}
          >
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      <div style={{ marginTop: 18, display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <article style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h2>Quick Image Upload</h2>
          <FileUpload
            variant="image"
            useMediaLibrary
            accept={['image/jpeg', 'image/png', 'image/webp']}
            maxFiles={3}
            onUpload={setUploadedFiles}
          />
          <small>Uploaded: {uploadedFiles.length}</small>
        </article>
        <article style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h2>Avatar Upload</h2>
          <AvatarUpload onUpload={(file) => console.log('Avatar uploaded', file.url)} />
        </article>
      </div>
    </section>
  );
}
