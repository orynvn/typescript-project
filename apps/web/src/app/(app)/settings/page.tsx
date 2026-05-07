'use client';

import { useConfirm } from '@/hooks/use-confirm';

export default function SettingsPage(): JSX.Element {
  const confirm = useConfirm();

  return (
    <section>
      <h1>Settings</h1>
      <p>Account / Notifications / Security / Danger Zone scaffold.</p>
      <button
        type="button"
        onClick={() => {
          void (async () => {
            const ok = await confirm({
              title: 'Reset preferences?',
              description: 'This action will reset your local preferences.',
              confirmLabel: 'Reset',
              variant: 'warning',
            });
            if (ok) {
              console.log('Reset preferences');
            }
          })();
        }}
      >
        Reset Preferences
      </button>
    </section>
  );
}
