import React from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="p-2 text-sm border-none bg-transparent text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 focus:ring-0"
    >
      <option value="fr">FR</option>
      <option value="en">EN</option>
    </select>
  );
}