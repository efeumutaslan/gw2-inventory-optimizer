import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export default function ApiKeyScreen() {
  const { validateAndSetKey, error, isLoading, loadingMessage } = useInventory();
  const [apiKey, setApiKey] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (!apiKey.trim()) {
      setLocalError('API Key gerekli');
      return;
    }
    
    const result = await validateAndSetKey(apiKey.trim());
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gw2-accent mb-2">GW2 Inventory Manager</h1>
          <p className="text-gray-400">Guild Wars 2 envanter yönetim aracı</p>
        </div>

        <div className="bg-gw2-dark/50 backdrop-blur rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">API Key Girin</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Guild Wars 2 API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX..."
                className="input-field font-mono text-sm"
                disabled={isLoading}
              />
            </div>

            {(localError || error) && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {localError || error}
              </div>
            )}

            {isLoading && (
              <div className="mb-4 p-3 bg-gw2-accent/20 border border-gw2-accent/50 rounded-lg text-gw2-accent text-sm flex items-center gap-2">
                <div className="loading-spinner w-4 h-4 border-2"></div>
                {loadingMessage}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-50">
              {isLoading ? 'Doğrulanıyor...' : 'Bağlan'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-3">API Key Nasıl Alınır?</h3>
            <ol className="text-sm text-gray-400 space-y-2">
              <li className="flex gap-2">
                <span className="text-gw2-accent font-bold">1.</span>
                <a href="https://account.arena.net/applications" target="_blank" rel="noopener noreferrer" className="text-gw2-accent hover:underline">
                  ArenaNet hesap sayfasına
                </a> gidin
              </li>
              <li className="flex gap-2">
                <span className="text-gw2-accent font-bold">2.</span>
                <span>"New Key" butonuna tıklayın</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gw2-accent font-bold">3.</span>
                <span>Aşağıdaki izinleri seçin:</span>
              </li>
            </ol>
            
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gw2-darker rounded text-xs text-gw2-accent">account</span>
              <span className="px-2 py-1 bg-gw2-darker rounded text-xs text-gw2-accent">inventories</span>
              <span className="px-2 py-1 bg-gw2-darker rounded text-xs text-gw2-accent">characters</span>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              🔒 API Key sadece tarayıcınızda saklanır ve sunucuya gönderilmez.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
