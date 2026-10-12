import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { getPublicBasePath } from './basePath';
import { registerLicense } from '@syncfusion/ej2-base';
import { ThemeProvider } from './hooks/useTheme';
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in index.html');
}

const key = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
if (key) {
  registerLicense(key);
}

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={getPublicBasePath()}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
