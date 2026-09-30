import { describe, expect, it } from 'vitest'
import { oauthRedirectUrl, readOAuthError } from '@/lib/oauth'

/**
 * Возврат от Google: в адресе либо код входа, либо ошибка.
 * Ошибка должна превратиться в понятный текст, а код — сохраниться для журнала.
 */
describe('readOAuthError — ошибка входа через Google', () => {
  it('обычный возврат с кодом — ошибки нет', () => {
    expect(readOAuthError('?code=abc123')).toBeNull()
    expect(readOAuthError('')).toBeNull()
  })

  it('участница нажала «Отмена» у Google — объясняем по-человечески', () => {
    const result = readOAuthError(
      '?error=access_denied&error_description=The+user+denied+the+request',
    )
    expect(result?.message).toMatch(/отменён/)
    expect(result?.technical).toBe('access_denied | The user denied the request')
  })

  it('ошибка может прийти после # — её тоже видно', () => {
    const result = readOAuthError('', '#error=server_error&error_code=unexpected_failure')
    expect(result?.message).toMatch(/не пускает/)
    expect(result?.technical).toContain('unexpected_failure')
  })

  it('устаревшая ссылка (bad_oauth_state) — просим нажать кнопку ещё раз', () => {
    const result = readOAuthError('?error=invalid_request&error_code=bad_oauth_state')
    expect(result?.message).toMatch(/устарела/)
  })

  it('неизвестная ошибка — общий текст, но код не теряется', () => {
    const result = readOAuthError('?error=temporarily_unavailable')
    expect(result?.message).toMatch(/Не удалось войти через Google/)
    expect(result?.technical).toBe('temporarily_unavailable')
  })
})

describe('oauthRedirectUrl — куда Google вернёт участницу', () => {
  it('на экран входа того же сайта, где нажали кнопку', () => {
    expect(oauthRedirectUrl('https://lerree-lab-dz-cicd.vercel.app')).toBe(
      'https://lerree-lab-dz-cicd.vercel.app/login',
    )
  })
})
