'use client';

import { useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface ActionBottomSheetProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sheetVariants = {
  hidden: { y: '100%' },
  visible: { y: 0 },
};

export function BottomSheet({
  isOpen,
  onClose,
  children,
  className,
}: ActionBottomSheetProps) {
  const springTransition = useMemo<Transition>(
    () => ({ type: 'spring', stiffness: 300, damping: 30 }),
    []
  );

  const handleDragEnd = (
    _event: unknown,
    info: { offset: { y: number }; velocity: { y: number } }
  ) => {
    const dragOffset = info.offset.y ?? 0;
    const dragVelocity = info.velocity.y ?? 0;

    if (dragOffset > 50 || dragVelocity > 800) {
      onClose(false);
    }
  };

  const handleOverlayClick = () => {
    onClose(false);
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            key="action-sheet-overlay"
            className="fixed inset-0 z-40 bg-black/80"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={handleOverlayClick}
          />

          <motion.div
            key="action-sheet-content"
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[80vh] max-h-[80vh] w-full max-w-lg flex-col rounded-t-3xl border border-b-0 border-slate-800 bg-[#111111] text-slate-100 shadow-[0_0_1px_hsl(var(--primary)/0.4),0_-25px_65px_rgba(0,0,0,0.7)]',
              className
            )}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={springTransition}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            dragMomentum={false}
          >
            <div className="flex cursor-grab flex-col px-6 pb-6 active:cursor-grabbing">
              <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-slate-700" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
              {children}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
