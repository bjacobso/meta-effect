/**
 * Meta Effect Registry Demo
 *
 * React entry point for the registry browser application
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RegistryPage } from './pages/RegistryPage'
import { DemoPage } from './pages/DemoPage'
import { CELPlayground } from './pages/CELPlayground'
import '@xyflow/react/dist/style.css'
import './index.css'

const rootElement = document.getElementById('app')!

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RegistryPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/cel-playground" element={<CELPlayground />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
