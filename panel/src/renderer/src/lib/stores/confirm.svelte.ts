export interface ConfirmRequest {
  title: string
  body: string
  /** red confirm button for actions that stop something or send to the printer */
  danger?: boolean
}

interface Pending extends ConfirmRequest {
  resolve: (answer: boolean) => void
}

let pending = $state<Pending | null>(null)

/** Asks the user to confirm. The dialog is drawn once, by ConfirmHost in App.svelte. */
export function confirmAction(request: ConfirmRequest): Promise<boolean> {
  pending?.resolve(false)
  return new Promise((resolve) => {
    pending = { ...request, resolve }
  })
}

export const confirmState = {
  get current(): Pending | null {
    return pending
  },
  answer(value: boolean): void {
    const p = pending
    pending = null
    p?.resolve(value)
  }
}
