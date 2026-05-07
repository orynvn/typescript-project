'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AsyncCombobox } from '@/components/combobox/async-combobox';
import { DataTable, type ColumnDef } from '@/components/data-table/data-table';
import { useConfirm } from '@/hooks/use-confirm';
import type { User } from '@/types';

const users: User[] = [
  { id: '1', name: 'Super Admin', email: 'admin@example.com', role: 'SUPER_ADMIN' },
  { id: '2', name: 'Alice', email: 'alice@example.com', role: 'ADMIN' },
  { id: '3', name: 'Bob', email: 'bob@example.com', role: 'USER' },
];

const columns: ColumnDef<User>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
];

export default function UsersPage(): JSX.Element {
  const router = useRouter();
  const confirm = useConfirm();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  return (
    <section>
      <h1>Users</h1>
      <div style={{ maxWidth: 360, marginBottom: 12 }}>
        <AsyncCombobox<User>
          queryKey="users-combobox"
          placeholder="Search users..."
          queryFn={async (search) =>
            users.filter((user) => user.name.toLowerCase().includes(search.toLowerCase()))
          }
          getOptionLabel={(user) => `${user.name} (${user.email})`}
          getOptionValue={(user) => user.id}
          onChange={setSelectedUser}
        />
        {selectedUser ? <small>Selected: {selectedUser.name}</small> : null}
      </div>
      <DataTable
        data={users}
        columns={columns}
        onEdit={(row) => router.push(`/users/${row.id}`)}
        onDelete={(row) => {
          void (async () => {
            const ok = await confirm({
              title: 'Delete user?',
              description: `This will permanently remove ${row.name}.`,
              confirmLabel: 'Delete',
              variant: 'danger',
            });
            if (ok) {
              console.log('Delete user', row.id);
            }
          })();
        }}
      />
    </section>
  );
}
