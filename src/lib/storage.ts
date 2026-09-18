/**
 * Обёртка над localStorage: в приватном режиме Safari запись может упасть,
 * и из-за этого не должен ломаться весь экран.
 */

const PREFIX = 'lerree-demo:'

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // Хранилище недоступно — молча продолжаем, данные останутся только в памяти.
  }
}
