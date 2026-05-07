export * from '@repo/types';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
};
