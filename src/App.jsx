import { InventoryProvider, useInventory } from './context/InventoryContext';
import { I18nProvider } from './context/I18nContext';
import ApiKeyScreen from './components/ApiKeyScreen';
import Dashboard from './components/Dashboard';
import './index.css';

function AppContent() {
  const { apiKey, isValidated } = useInventory();
  if (!apiKey || !isValidated) return <ApiKeyScreen />;
  return <Dashboard />;
}

function App() {
  return (
    <I18nProvider>
      <InventoryProvider>
        <AppContent />
      </InventoryProvider>
    </I18nProvider>
  );
}

export default App;
