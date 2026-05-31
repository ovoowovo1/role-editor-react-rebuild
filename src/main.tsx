import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

if (window.location.pathname === '/batch-render') {
  void import('./batchRender');
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
