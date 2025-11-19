import type { ComponentType } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils/cn';

interface HistoryTimelineMarkerProps {
  colorClass: string;
  icon: ComponentType<{ className?: string }>;
}

export const HistoryTimelineMarker = ({
  colorClass,
  icon: Icon,
}: HistoryTimelineMarkerProps) => (
  <div className="relative flex items-center justify-center">
    <motion.span
      aria-hidden="true"
      layout
      initial={{ scale: 0.6, opacity: 0, y: 4 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'bg-background relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-base shadow-[0_0_20px_rgb(0_0_0/0.5)]',
        colorClass
      )}
    >
      <Icon className="h-4 w-4" />
    </motion.span>
    <motion.span
      aria-hidden="true"
      className="bg-primary/10 pointer-events-none absolute z-0 h-10 w-10 rounded-full border border-white/5 shadow-[0_0_35px_rgba(0,179,211,0.38)]"
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 0.35, scale: 1.1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    />
  </div>
);
