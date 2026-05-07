'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type SeoSettings = Record<string, string>;

const groups: Array<{ id: string; label: string }> = [
  { id: 'site', label: 'Site' },
  { id: 'meta', label: 'Metadata' },
  { id: 'social', label: 'Social' },
  { id: 'robots', label: 'Robots' },
  { id: 'analytics', label: 'Analytics' },
];

export default function SeoSettingsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [activeGroup, setActiveGroup] = useState('site');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SeoSettings>({});

  const { data: settings = {} } = useQuery({
    queryKey: ['seo-settings'],
    queryFn: async () => {
      const response = await api.get('/seo/settings');
      const payload = (response.data?.data ?? response.data) as SeoSettings;
      setForm(payload);
      return payload;
    },
  });

  const currentFields = useMemo(
    () => Object.entries(form).filter(([key]) => key.startsWith(`${activeGroup}.`)),
    [activeGroup, form],
  );

  const previewTitle = form['meta.title.default'] ?? 'MyApp';
  const previewDescription = form['meta.description'] ?? 'Default description';

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await api.patch('/seo/settings', { updates: form });
      await queryClient.invalidateQueries({ queryKey: ['seo-settings'] });
    } finally {
      setSaving(false);
    }
  }

  async function reset(): Promise<void> {
    setSaving(true);
    try {
      await api.post('/seo/settings/reset');
      await queryClient.invalidateQueries({ queryKey: ['seo-settings'] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>SEO Settings</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => void reset()} disabled={saving}>
            Reset defaults
          </button>
          <button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </header>

      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActiveGroup(group.id)}
            style={{ fontWeight: activeGroup === group.id ? 700 : 400 }}
          >
            {group.label}
          </button>
        ))}
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <article style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h2>{groups.find((group) => group.id === activeGroup)?.label}</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {currentFields.map(([key, value]) => (
              <label key={key} style={{ display: 'grid', gap: 4 }}>
                <span>{key}</span>
                <input
                  value={value}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
            {currentFields.length === 0 ? <small>No settings in this group yet.</small> : null}
          </div>
        </article>

        <article
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 12,
            display: 'grid',
            gap: 10,
          }}
        >
          <h2>SERP Preview</h2>
          <small style={{ color: '#166534' }}>{form['site.url'] ?? 'https://example.com'}</small>
          <strong>{previewTitle}</strong>
          <p style={{ margin: 0 }}>{previewDescription}</p>

          <h2 style={{ marginTop: 8 }}>OG Preview</h2>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ height: 130, background: '#f3f4f6' }} />
            <div style={{ padding: 10 }}>
              <small>{(form['site.name'] ?? 'MYAPP').toUpperCase()}</small>
              <p style={{ margin: '4px 0 0' }}>{previewTitle}</p>
            </div>
          </div>
        </article>
      </div>

      <article style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2>Current Keys</h2>
        <p>Total keys: {Object.keys(settings).length}</p>
      </article>
    </section>
  );
}
