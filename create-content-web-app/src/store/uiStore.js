import { create } from 'zustand';

// Yalniz istemci durumu (sunucu verisi React Query'de). Okuma: useUiStore((s) => s.navOpen).
const useUiStore = create((set) => ({
  navOpen: true,
  toggleNav: () => set((s) => ({ navOpen: !s.navOpen })),
}));

export default useUiStore;
