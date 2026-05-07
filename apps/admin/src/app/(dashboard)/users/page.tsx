'use client';

import { useRouter } from 'next/navigation';
import { DataTable, type ColumnDef } from '@/components/data-table/data-table';
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

  return (
    <section>
      <h1>Users</h1>
      <DataTable
        data={users}
        columns={columns}
        onEdit={(row) => router.push(`/users/${row.id}`)}
        onDelete={(row) => console.log('Delete user', row.id)}
      />
    </section>
  );
}
