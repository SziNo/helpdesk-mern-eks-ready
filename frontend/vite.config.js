import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Vite konfiguráció.
// Fejlesztéskor a dev szerver az /api kéréseket a backendre proxyzza (a régi CRA
// "proxy" mező megfelelője), így a kód relatív /api/... útvonalakat használhat.
// Élesben a Kubernetes Gateway irányítja az /api-t a backendre, ezért build
// idejű API URL-re nincs szükség.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  }
})
