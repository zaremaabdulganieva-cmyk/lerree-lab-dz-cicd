import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MeasurementsPage from '@/pages/MeasurementsPage'
import { TEST_MEASUREMENTS } from '@/test/fixtures'
import type { Measurement, MeasurementInput } from '@/lib/types'

const fetchMeasurements = vi.fn()
const saveMeasurement = vi.fn()

vi.mock('@/lib/api', () => ({
  fetchMeasurements: () => fetchMeasurements(),
  saveMeasurement: (input: MeasurementInput) => saveMeasurement(input),
}))

beforeEach(() => {
  fetchMeasurements.mockReset()
  saveMeasurement.mockReset()
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
})
