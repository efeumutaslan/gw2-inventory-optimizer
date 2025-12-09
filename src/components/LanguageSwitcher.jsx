import { useTranslation } from '../context/I18nContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, languages } = useTranslation();
  
  return (
    <div className="flex items-center gap-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`px-2 py-1 text-sm rounded transition-colors flex items-center gap-1 ${
            language === lang.code
              ? 'bg-gw2-accent text-white'
              : 'bg-gw2-dark text-gray-400 hover:text-white hover:bg-gw2-darker'
          }`}
          title={lang.name}
        >
          <span>{lang.flag}</span>
          <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
