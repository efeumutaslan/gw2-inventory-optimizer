import { InventoryProvider, useInventory } from './context/InventoryContext';
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
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}

export default App;
