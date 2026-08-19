import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState, type ReactElement } from 'react'

export function ConfirmDialog({
  actionLabel,
  description,
  onConfirm,
  pending = false,
  title,
  trigger,
}: {
  actionLabel: string
  description: string
  onConfirm: () => void | Promise<void>
  pending?: boolean | undefined
  title: string
  trigger: ReactElement
}) {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion() ?? false

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger>
      <AnimatePresence initial={false}>
        {open ? (
          <AlertDialogPrimitive.Portal forceMount>
            <AlertDialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="confirm-dialog__overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              />
            </AlertDialogPrimitive.Overlay>
            <AlertDialogPrimitive.Content className="confirm-dialog__viewport" forceMount>
              <motion.div
                className="confirm-dialog"
                initial={reduceMotion ? { opacity: 0, y: 12 } : { opacity: 0, scale: 0.9, y: 26, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? { opacity: 0, y: 8 } : { opacity: 0, scale: 0.96, y: 12, filter: 'blur(4px)' }}
                transition={reduceMotion
                  ? { duration: 0.01 }
                  : { type: 'spring', stiffness: 280, damping: 24, mass: 0.92 }}
              >
                <header className="confirm-dialog__header">
                  <AlertDialogPrimitive.Title>{title}</AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description>{description}</AlertDialogPrimitive.Description>
                </header>
                <footer className="confirm-dialog__footer">
                  <AlertDialogPrimitive.Cancel className="confirm-dialog__cancel">Cancel</AlertDialogPrimitive.Cancel>
                  <AlertDialogPrimitive.Action
                    className="confirm-dialog__action"
                    disabled={pending}
                    onClick={() => void onConfirm()}
                  >
                    {pending ? 'Working…' : actionLabel}
                  </AlertDialogPrimitive.Action>
                </footer>
              </motion.div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </AlertDialogPrimitive.Root>
  )
}
