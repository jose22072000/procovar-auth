"use client";

import { create } from "zustand";

interface SidebarState {
    isOpenDesktop: boolean;
    isOpenMobile: boolean;
    openDesktop: () => void;
    closeDesktop: () => void;
    toggleDesktop: () => void;
    openMobile: () => void;
    closeMobile: () => void;
    toggleMobile: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
    isOpenDesktop: true,
    isOpenMobile: false,
    openDesktop: () => set({ isOpenDesktop: true }),
    closeDesktop: () => set({ isOpenDesktop: false }),
    toggleDesktop: () => set((state) => ({ isOpenDesktop: !state.isOpenDesktop })),
    openMobile: () => set({ isOpenMobile: true }),
    closeMobile: () => set({ isOpenMobile: false }),
    toggleMobile: () => set((state) => ({ isOpenMobile: !state.isOpenMobile })),
}));
