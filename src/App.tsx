import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './components/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <div id="spa-experience-app" className="bg-black min-h-screen">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
