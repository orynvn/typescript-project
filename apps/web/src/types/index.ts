export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
};
