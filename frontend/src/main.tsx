import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router' 
import { Toaster } from 'sonner'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111111',
              border: '1px solid #252525',
              color: '#E2E2E2',
              fontFamily: "'Syne', sans-serif",
              fontSize: '13px',
              borderRadius: '0px',
            },
          }}
        />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
