import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/lib/auth'
// Шрифт лежит на нашем же сайте, а не на серверах Google: страница не
// ждёт чужой сервер, и Google не узнаёт о каждом посетителе.
import '@fontsource-variable/manrope'
import '@/index.css'

// Обычные адреса (/programs, а не /#/programs): на Vercel любой путь
// отдаёт index.html (правило rewrites в vercel.json), поэтому прямые
// ссылки и обновление страницы работают. Нужно и для входа через Google —
// Supabase возвращает участницу на /login.
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
