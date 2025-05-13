import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LanguageState {
  language: 'fr' | 'en';
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'fr',
      toggleLanguage: () => set((state) => ({ 
        language: state.language === 'fr' ? 'en' : 'fr' 
      })),
    }),
    {
      name: 'language-storage',
    }
  )
);