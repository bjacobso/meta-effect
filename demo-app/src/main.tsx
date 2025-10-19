/**
 * Meta Effect Registry Demo
 *
 * React entry point for the registry browser application
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './components/App'
import './index.css'

const rootElement = document.getElementById('app')!

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
