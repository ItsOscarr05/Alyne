import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './hooks/useAuth.tsx';
import { AppRouter } from './routes';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
