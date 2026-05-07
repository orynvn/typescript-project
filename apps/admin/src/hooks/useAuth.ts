import { useAuthStore } from '@/stores/auth.store';

export const useAuth = (): ReturnType<typeof useAuthStore> => useAuthStore();
