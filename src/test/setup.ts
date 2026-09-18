import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

// Каждый тест стартует с чистого DOM и пустого localStorage,
// чтобы состояние одного сценария не протекало в другой.
beforeEach(() => {
  // Серверные тесты (api/) идут без браузера — там хранилища нет.
  if (typeof localStorage !== 'undefined') localStorage.clear()
})

afterEach(() => {
  cleanup()
})
