import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState, type ReactElement } from 'react'

interface SecondaryAction {
  label: string
  onAction: () => void | Promise<void>
  pending?: boolean | undefined
}

export function ConfirmDialog({
  actionLabel,
  description,
  onConfirm,
  pending = false,
  title,
  trigger,
  secondaryAction,
  errorMessage,
}: {
  actionLabel: string
  description: string
  onConfirm: () => void | Promise<void>
  pending?: boolean | undefined
  title: string
  trigger: ReactElement
  secondaryAction?: SecondaryAction | undefined
  errorMessage?: string | null | undefined
}) {
  const [open, setOpen] = useState(false)
  const [workingAction, setWorkingAction] = useState<'primary' | 'secondary' | null>(null)
  const reduceMotion = useReducedMotion() ?? false
  const working = pending || workingAction !== null

  const runAction = async (kind: 'primary' | 'secondary') => {
    setWorkingAction(kind)
    try {
      if (kind === 'primary') await onConfirm()
      else await secondaryAction?.onAction()
      setOpen(false)
    } catch {
      // The owning mutation renders its durable-write error; keep this dialog open for retry.
    } finally {
      setWorkingAction(null)
    }
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(nextOpen) => { if (!working) setOpen(nextOpen) }}>
      <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger>
      <AnimatePresence initial={false}>
        {open ? (
          <AlertDialogPrimitive.Portal forceMount>
            <AlertDialogPrimitive.Overlay asChild forceMount>
              <motion.div className="confirm-dialog__overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: [0.16, 1, 0.3, 1] }} />
            </AlertDialogPrimitive.Overlay>
            <AlertDialogPrimitive.Content className="confirm-dialog__viewport" forceMount>
              <motion.div
                className="confirm-dialog"
                initial={reduceMotion ? { opacity: 0, y: 12 } : { opacity: 0, scale: 0.9, y: 26, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? { opacity: 0, y: 8 } : { opacity: 0, scale: 0.96, y: 12, filter: 'blur(4px)' }}
                transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 280, damping: 24, mass: 0.92 }}
              >
                <header className="confirm-dialog__header">
                  <AlertDialogPrimitive.Title>{title}</AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description>{description}</AlertDialogPrimitive.Description>
                </header>
                {errorMessage ? <p className="confirm-dialog__error" role="alert">{errorMessage}</p> : null}
                <footer className="confirm-dialog__footer">
                  {secondaryAction ? (
                    <button className="confirm-dialog__secondary-action" disabled={working || secondaryAction.pending} type="button" onClick={() => void runAction('secondary')}>
                      {workingAction === 'secondary' || secondaryAction.pending ? 'Working…' : secondaryAction.label}
                    </button>
                  ) : null}
                  <AlertDialogPrimitive.Cancel className="confirm-dialog__cancel" disabled={working}>Cancel</AlertDialogPrimitive.Cancel>
                  <button className="confirm-dialog__action" disabled={working} type="button" onClick={() => void runAction('primary')}>
                    {workingAction === 'primary' || pending ? 'Working…' : actionLabel}
                  </button>
                </footer>
              </motion.div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </AlertDialogPrimitive.Root>
  )
}
