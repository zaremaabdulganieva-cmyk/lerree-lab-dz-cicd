import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MeasurementsPage from '@/pages/MeasurementsPage'
import { TEST_MEASUREMENTS } from '@/test/fixtures'
import type { Measurement, MeasurementInput } from '@/lib/types'

const fetchMeasurements = vi.fn()
const saveMeasurement = vi.fn()
const updateMeasurement = vi.fn()
const deleteMeasurement = vi.fn()

vi.mock('@/lib/api', () => ({
  fetchMeasurements: () => fetchMeasurements(),
  saveMeasurement: (input: MeasurementInput) => saveMeasurement(input),
  updateMeasurement: (id: string, input: MeasurementInput) => updateMeasurement(id, input),
  deleteMeasurement: (id: string) => deleteMeasurement(id),
}))

beforeEach(() => {
  fetchMeasurements.mockReset()
  saveMeasurement.mockReset()
  updateMeasurement.mockReset()
  deleteMeasurement.mockReset()
  updateMeasurement.mockImplementation(async (id: string, input: MeasurementInput) =>
    TEST_MEASUREMENTS.map((item) => (item.id === id ? { id, ...input } : item)),
  )
  deleteMeasurement.mockImplementation(async (id: string) =>
    TEST_MEASUREMENTS.filter((item) => item.id !== id),
  )
  fetchMeasurements.mockResolvedValue(TEST_MEASUREMENTS)
  // Сервер отвечает обновлённой историей — как настоящий.
  saveMeasurement.mockImplementation(async (input: MeasurementInput) => {
    const saved: Measurement = { id: 'ms-new', ...input }
    return [...TEST_MEASUREMENTS, saved]
  })
})

async function renderLoaded() {
  render(<MeasurementsPage />)
  await waitForElementToBeRemoved(() => screen.queryByTestId('loading-state'))
}

describe('MeasurementsPage — личные замеры', () => {
  it('показывает историю замеров с динамикой', async () => {
    await renderLoaded()

    expect(screen.getByText('1 августа 2026')).toBeInTheDocument()
    expect(screen.getByText(/вес −0,7 кг/)).toBeInTheDocument()
  })

  it('отправляет замер на сервер и показывает его в истории', async () => {
    const user = userEvent.setup()
    await renderLoaded()

    await user.type(screen.getByLabelText('Дата'), '2026-09-01')
    await user.type(screen.getByLabelText('Вес, кг'), '60,1')
    await user.type(screen.getByLabelText('Талия, см'), '68')
    await user.type(screen.getByLabelText('Бёдра, см'), '95')
    await user.click(screen.getByRole('button', { name: 'Сохранить замер' }))

    expect(await screen.findByText('1 сентября 2026')).toBeInTheDocument()
    expect(screen.getByText('60,1 кг')).toBeInTheDocument()
    expect(saveMeasurement).toHaveBeenCalledWith({
      date: '2026-09-01',
      weightKg: 60.1,
      waistCm: 68,
      hipsCm: 95,
    })
  })

  it('не отправляет на сервер замер с некорректными значениями', async () => {
    const user = userEvent.setup()
    await renderLoaded()

    await user.type(screen.getByLabelText('Вес, кг'), '-3')
    await user.click(screen.getByRole('button', { name: 'Сохранить замер' }))

    expect(screen.getByText('Укажите дату замера')).toBeInTheDocument()
    expect(screen.getByText('Значение должно быть больше 0')).toBeInTheDocument()
    expect(saveMeasurement).not.toHaveBeenCalled()
  })

  async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Дата'), '2026-09-01')
    await user.type(screen.getByLabelText('Вес, кг'), '60')
    await user.type(screen.getByLabelText('Талия, см'), '68')
    await user.type(screen.getByLabelText('Бёдра, см'), '95')
  }

  it('сообщает об обрыве связи при сохранении', async () => {
    const user = userEvent.setup()
    await renderLoaded()
    await fillValidForm(user)

    saveMeasurement.mockRejectedValue(
      new Error('Нет связи с сервером. Проверьте интернет и повторите попытку.'),
    )
    await user.click(screen.getByRole('button', { name: 'Сохранить замер' }))

    expect(await screen.findByText(/Нет связи с сервером/)).toBeInTheDocument()
  })

  it('объясняет отказ сервера, если замер на эту дату уже есть', async () => {
    const user = userEvent.setup()
    await renderLoaded()
    await fillValidForm(user)

    saveMeasurement.mockRejectedValue(
      new Error('Запись на эту дату уже есть. Измените дату или отредактируйте существующую.'),
    )
    await user.click(screen.getByRole('button', { name: 'Сохранить замер' }))

    expect(await screen.findByText(/Запись на эту дату уже есть/)).toBeInTheDocument()
  })

  it('при истёкшей сессии просит войти заново', async () => {
    const user = userEvent.setup()
    await renderLoaded()
    await fillValidForm(user)

    saveMeasurement.mockRejectedValue(new Error('Сессия истекла. Войдите заново.'))
    await user.click(screen.getByRole('button', { name: 'Сохранить замер' }))

    expect(await screen.findByText(/Сессия истекла/)).toBeInTheDocument()
  })

  describe('исправление и удаление', () => {
    it('«Изменить» подставляет замер в форму, сохранение отправляет исправление', async () => {
      const user = userEvent.setup()
      await renderLoaded()
      const first = TEST_MEASUREMENTS[2]

      await user.click(screen.getByRole('button', { name: 'Изменить замер за 1 августа 2026' }))

      expect(screen.getByRole('heading', { name: 'Исправить замер' })).toBeInTheDocument()
      expect(screen.getByLabelText('Дата')).toHaveValue(first.date)
      const weight = screen.getByLabelText('Вес, кг')
      expect(weight).toHaveValue(String(first.weightKg).replace('.', ','))

      await user.clear(weight)
      await user.type(weight, '59,9')
      await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }))

      expect(updateMeasurement).toHaveBeenCalledWith(
        first.id,
        expect.objectContaining({ date: first.date, weightKg: 59.9 }),
      )
      expect(saveMeasurement).not.toHaveBeenCalled()
      expect(await screen.findByText('59,9 кг')).toBeInTheDocument()
      // После сохранения форма снова для нового замера.
      expect(screen.getByRole('heading', { name: 'Новый замер' })).toBeInTheDocument()
    })

    it('«Отменить» возвращает пустую форму нового замера', async () => {
      const user = userEvent.setup()
      await renderLoaded()

      await user.click(screen.getByRole('button', { name: 'Изменить замер за 1 августа 2026' }))
      await user.click(screen.getByRole('button', { name: 'Отменить' }))

      expect(screen.getByRole('heading', { name: 'Новый замер' })).toBeInTheDocument()
      expect(screen.getByLabelText('Дата')).toHaveValue('')
    })

    it('удаляет только после подтверждения', async () => {
      const user = userEvent.setup()
      await renderLoaded()

      await user.click(screen.getByRole('button', { name: 'Удалить замер за 1 августа 2026' }))
      expect(deleteMeasurement).not.toHaveBeenCalled()
      expect(screen.getByText(/Вернуть его будет нельзя/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Да, удалить' }))

      expect(deleteMeasurement).toHaveBeenCalledWith(TEST_MEASUREMENTS[2].id)
      await waitFor(() => expect(screen.queryByText('1 августа 2026')).not.toBeInTheDocument())
    })

    it('«Оставить» отменяет удаление', async () => {
      const user = userEvent.setup()
      await renderLoaded()

      await user.click(screen.getByRole('button', { name: 'Удалить замер за 1 августа 2026' }))
      await user.click(screen.getByRole('button', { name: 'Оставить' }))

      expect(deleteMeasurement).not.toHaveBeenCalled()
      expect(screen.getByText('1 августа 2026')).toBeInTheDocument()
    })

    it('если удалить не вышло — объясняет и оставляет замер в списке', async () => {
      const user = userEvent.setup()
      await renderLoaded()
      deleteMeasurement.mockRejectedValue(new Error('Этот замер уже удалён. Обновите страницу.'))

      await user.click(screen.getByRole('button', { name: 'Удалить замер за 1 августа 2026' }))
      await user.click(screen.getByRole('button', { name: 'Да, удалить' }))

      expect(await screen.findByText(/уже удалён/)).toBeInTheDocument()
      expect(screen.getByText('1 августа 2026')).toBeInTheDocument()
    })
  })
})
