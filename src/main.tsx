import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root')!)

// The app module reads the configuration when it loads (src/core/config/env.ts):
// a missing or forbidden variable must show an explanation, not a blank page.
import('./app/App')
  .then(({ App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error: unknown) => {
    root.render(
      <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-extrabold text-fg">Console non configurée</h1>
          <p className="mt-2 text-sm text-fg-muted">{error instanceof Error ? error.message : 'Configuration invalide.'}</p>
          <p className="mt-4 text-xs text-fg-subtle">
            Hébergement : définir VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans les variables d’environnement, puis redéployer.
          </p>
        </div>
      </div>,
    )
  })
