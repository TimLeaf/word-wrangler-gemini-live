'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { PersonalityType, DEFAULT_PERSONALITY } from '@/types/personality';
import {
  Language,
  DEFAULT_LANGUAGE,
  LANGUAGE_PRESETS,
  LANGUAGE_STORAGE_KEY,
} from '@/types/language';

interface ConfigurationContextProps {
  personality: PersonalityType;
  setPersonality: (personality: PersonalityType) => void;
  language: Language;
  setLanguage: (language: Language) => void;
}

const ConfigurationContext = createContext<
  ConfigurationContextProps | undefined
>(undefined);

interface ConfigurationProviderProps {
  children: ReactNode;
}

function isValidLanguage(value: string | null): value is Language {
  return value !== null && value in LANGUAGE_PRESETS;
}

export function ConfigurationProvider({
  children,
}: ConfigurationProviderProps) {
  const [personality, setPersonality] =
    useState<PersonalityType>(DEFAULT_PERSONALITY);
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  // localStorage は SSR で参照不可。マウント後に一度だけ同期する。
  // react-hooks/set-state-in-effect は通常嫌うが、ハイドレーション整合のため
  // 初回レンダーは DEFAULT で出し、クライアント側 effect で復元する必要がある。
  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isValidLanguage(stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  };

  const value = {
    personality,
    setPersonality,
    language,
    setLanguage,
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
}

export function useConfigurationSettings() {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error(
      'useConfigurationSettings must be used within a ConfigurationProvider'
    );
  }
  return context;
}
