import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSafeServiceWorker } from './lib/registerSafeServiceWorker'

if (import.meta.env.PROD) registerSafeServiceWorker()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
