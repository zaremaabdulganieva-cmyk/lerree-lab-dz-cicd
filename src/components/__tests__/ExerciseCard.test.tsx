import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExerciseCard from '@/components/ExerciseCard'
import type { Exercise, SetEntry } from '@/lib/types'
import { readDraft } from '@/lib/workout'

const saveSets = vi.fn()

vi.mock('@/lib/api', () => ({
  saveSets: (exerciseId: string, sets: SetEntry[]) => saveSets(exerciseId, sets),
}))

const EXERCISE: Exercise = {
  id: 'e-test',
  title: 'Приседания с гантелями',
  hint: 'Спина ровная',
  plannedSets: 2,
  repsRange: '10–12',
  lastTime: [{ kg: 12, reps: 12 }],
  hasVideo: true,
}

beforeEach(() => {
  saveSets.mockReset()
  saveSets.mockResolvedValue({})
})

describe('ExerciseCard — ввод рабочего веса', () => {
  it('показывает подсказку с результатом прошлой тренировки', () => {
    render(<ExerciseCard exercise={EXERCISE} />)
    expect(screen.getByText(/В прошлый раз: 12 кг × 12/)).toBeInTheDocument()
  })

  it('отправляет заполненный подход на сервер', async () => {
    const user = userEvent.setup()
    render(<ExerciseCard exercise={EXERCISE} />)

    await user.type(screen.getByLabelText(/вес, подход 1/i), '14')
    await user.type(screen.getByLabelText(/повторы, подход 1/i), '10')

    const saveButton = screen.getByRole('button', { name: 'Сохранить' })
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)

    expect(await screen.findByText('Сохранено')).toBeInTheDocument()
    expect(saveSets).toHaveBeenCalledWith('e-test', [{ kg: 14, reps: 10 }])
  })

  it('блокирует сохранение и показывает ошибку при отрицательном весе', async () => {
    const user = userEvent.setup()
    render(<ExerciseCard exercise={EXERCISE} />)

    await user.type(screen.getByLabelText(/вес, подход 1/i), '-5')
    await user.type(screen.getByLabelText(/повторы, подход 1/i), '10')

    expect(screen.getByText('Вес не может быть отрицательным')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    expect(saveSets).not.toHaveBeenCalled()
  })

  it('при обрыве связи сообщает об ошибке и сохраняет черновик на устройстве', async () => {
    const user = userEvent.setup()
    render(<ExerciseCard exercise={EXERCISE} />)

    await user.type(screen.getByLabelText(/вес, подход 1/i), '14')
    await user.type(screen.getByLabelText(/повторы, подход 1/i), '10')

    saveSets.mockRejectedValue(
      new Error('Нет связи с сервером. Проверьте интернет и повторите попытку.'),
    )
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText(/Нет связи с сервером/)).toBeInTheDocument()
    expect(readDraft('e-test')?.[0]).toEqual({ kg: '14', reps: '10' })
  })

  it('при отказе базы по проверке значений объясняет, что не так', async () => {
    const user = userEvent.setup()
    render(<ExerciseCard exercise={EXERCISE} />)

    await user.type(screen.getByLabelText(/вес, подход 1/i), '14')
    await user.type(screen.getByLabelText(/повторы, подход 1/i), '10')

    saveSets.mockRejectedValue(
      new Error('Значение выходит за разумные пределы. Проверьте, что ввели.'),
    )
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText(/Значение выходит за разумные пределы/)).toBeInTheDocument()
  })

  it('открывает и скрывает блок с видео-разбором', async () => {
    const user = userEvent.setup()
    render(<ExerciseCard exercise={EXERCISE} />)

    await user.click(screen.getByRole('button', { name: 'Смотреть видео' }))
    expect(screen.getByText(/Видео-разбор/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Скрыть видео' }))
    expect(screen.queryByText(/Видео-разбор/)).not.toBeInTheDocument()
  })
})
