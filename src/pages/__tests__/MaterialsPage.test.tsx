import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MaterialsPage from '@/pages/MaterialsPage'
import { TEST_MATERIALS } from '@/test/fixtures'

/**
 * Экран проверяем без обращения к базе: вместо неё — подставной слой
 * запросов. Так тест проверяет поведение страницы, а не наличие
 * интернета, и умеет воспроизвести ошибку сервера по заказу.
 */
const fetchMaterials = vi.fn()

vi.mock('@/lib/api', () => ({
  fetchMaterials: () => fetchMaterials(),
}))

beforeEach(() => {
  fetchMaterials.mockReset()
  fetchMaterials.mockResolvedValue(TEST_MATERIALS)
})

async function renderLoaded() {
  render(<MaterialsPage />)
  await waitForElementToBeRemoved(() => screen.queryByTestId('loading-state'))
}

describe('MaterialsPage — раздел материалов', () => {
  it('показывает скелет загрузки, а затем список материалов', async () => {
    render(<MaterialsPage />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()

    expect(await screen.findByText('Как подобрать рабочий вес')).toBeInTheDocument()
  })

  it('фильтрует список по поисковому запросу', async () => {
    const user = userEvent.setup()
    await renderLoaded()

    await user.type(screen.getByRole('searchbox'), 'сон')

    expect(screen.getByText('Подкаст: восстановление и сон')).toBeInTheDocument()
    expect(screen.queryByText('Как подобрать рабочий вес')).not.toBeInTheDocument()
  })

  it('показывает обучающее пустое состояние, если ничего не найдено', async () => {
    const user = userEvent.setup()
    await renderLoaded()

    await user.type(screen.getByRole('searchbox'), 'марафон')

    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
    expect(screen.getByText(/Попробуйте другое слово/)).toBeInTheDocument()
  })

  it('при обрыве связи показывает сообщение и кнопку повтора', async () => {
    fetchMaterials.mockRejectedValue(
      new Error('Нет связи с сервером. Проверьте интернет и повторите попытку.'),
    )
    render(<MaterialsPage />)

    expect(await screen.findByText(/Нет связи с сервером/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Попробовать снова' })).toBeInTheDocument()
  })

  it('повторяет запрос по кнопке «Попробовать снова»', async () => {
    const user = userEvent.setup()
    fetchMaterials.mockRejectedValueOnce(new Error('Нет связи с сервером.'))
    render(<MaterialsPage />)

    await user.click(await screen.findByRole('button', { name: 'Попробовать снова' }))

    expect(await screen.findByText('Как подобрать рабочий вес')).toBeInTheDocument()
  })

  it('при закрытом доступе показывает объяснение сервера, а не общую ошибку', async () => {
    fetchMaterials.mockRejectedValue(new Error('Доступ к этим данным закрыт.'))
    render(<MaterialsPage />)

    expect(await screen.findByText('Доступ к этим данным закрыт.')).toBeInTheDocument()
  })
})
