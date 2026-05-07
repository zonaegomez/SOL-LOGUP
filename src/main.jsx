import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { MonedaProvider } from './context/MonedaContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MonedaProvider>
      <App />
    </MonedaProvider>
  </React.StrictMode>
)
