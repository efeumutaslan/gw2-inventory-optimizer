import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function ApiKeyScreen() {
  const { validateAndSetKey, error, isLoading, loadingMessage } = useInventory();
  const { t, language } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (!apiKey.trim()) {
      setLocalError(t('api_invalid'));
      return;
    }
    
    const result = await validateAndSetKey(apiKey.trim());
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const features = [
    { icon: '📦', text: language === 'tr' ? 'Tüm karakterlerinizi tek ekranda görün' : 'View all characters in one screen' },
    { icon: '🎯', text: language === 'tr' ? 'Envanter optimizasyonu yapın' : 'Optimize your inventory' },
    { icon: '💡', text: language === 'tr' ? 'Akıllı öneriler alın' : 'Get smart recommendations' },
    { icon: '🗄️', text: language === 'tr' ? 'Material Storage yönetimi' : 'Material Storage management' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Language Switcher */}
        <div className="flex justify-end mb-6">
          <LanguageSwitcher />
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gw2-accent/20 rounded-full mb-4">
            <span className="text-4xl">⚔️</span>
          </div>
          <h1 className="text-3xl font-bold text-gw2-accent mb-2">{t('app_name')}</h1>
          <p className="text-gray-400">{t('api_description')}</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-gw2-dark/30 rounded-lg p-3 flex items-center gap-2">
              <span className="text-xl">{feature.icon}</span>
              <span className="text-xs text-gray-400">{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-gw2-dark/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔑</span>
            {t('api_title')}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Guild Wars 2 API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('api_placeholder')}
                className="input-field font-mono text-sm"
                disabled={isLoading}
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            {(localError || error) && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <span>⚠️</span>
                {localError || error}
              </div>
            )}

            {isLoading && (
              <div className="mb-4 p-3 bg-gw2-accent/10 border border-gw2-accent/30 rounded-lg text-gw2-accent text-sm flex items-center gap-3">
                <div className="loading-spinner-sm"></div>
                {loadingMessage || t('loading')}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? t('loading') : t('api_connect')}
            </button>
          </form>

          {/* Help Section */}
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span>❓</span>
              {language === 'tr' ? 'API Key Nasıl Alınır?' : 'How to get an API Key?'}
            </h3>
            <ol className="text-sm text-gray-400 space-y-2">
              <li className="flex gap-2">
                <span className="text-gw2-accent font-bold min-w-[20px]">1.</span>
                <span>
                  <a 
                    href="https://account.arena.net/applications" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gw2-accent hover:underline"
                  >
                    account.arena.net/applications
                  </a>
                  {language === 'tr' ? ' adresine gidin' : ' - Go to this page'}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gw2-accent font-bold min-w-[20px]">2.</span>
                <span>{language === 'tr' ? '"New Key" butonuna tıklayın' : 'Click "New Key" button'}</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gw2-accent font-bold min-w-[20px]">3.</span>
                <span>{language === 'tr' ? 'Aşağıdaki izinleri seçin:' : 'Select these permissions:'}</span>
              </li>
            </ol>
            
            <div className="mt-3 flex flex-wrap gap-2">
              {['account', 'inventories', 'characters', 'unlocks', 'wallet'].map(perm => (
                <span key={perm} className="px-2 py-1 bg-gw2-darker rounded text-xs text-gw2-accent border border-gw2-accent/30">
                  {perm}
                </span>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500 flex items-center gap-1">
              <span>🔒</span>
              {language === 'tr' 
                ? 'API Key sadece tarayıcınızda saklanır, sunucuya gönderilmez.' 
                : 'API Key is stored locally in your browser only.'}
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          {language === 'tr' 
            ? 'ArenaNet ile bağlantılı değildir. Resmi olmayan bir fan projesidir.'
            : 'Not affiliated with ArenaNet. Unofficial fan project.'}
        </p>
      </div>
    </div>
  );
}
