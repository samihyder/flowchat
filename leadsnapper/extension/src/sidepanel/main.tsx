import React from 'react'
import ReactDOM from 'react-dom/client'
import './sidepanel.css'
import SidePanel from './SidePanel'
import ErrorBoundary from './ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SidePanel />
    </ErrorBoundary>
  </React.StrictMode>
)
