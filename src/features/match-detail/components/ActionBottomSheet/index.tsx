'use client';

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { db, type ActionMaster } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';
import { ActionGrid } from './components/ActionGrid';
import { CategoryTabs } from './components/CategoryTabs';
import {
  FAVORITE_CATEGORY_KEY,
  SWIPE_THRESHOLD_PX,
  SWIPE_VELOCITY_PX,
} from './constants';
import { useCategorizedActions } from './hooks/useCategorizedActions';

const categoryVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%' }),
  center: { x: '0%' },
  exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%' }),
};

interface ActionBottomSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onActionSelect: (actionId: number, actionName: string) => void;
  title?: string;
}

export function ActionBottomSheet({
  isOpen,
  onOpenChange,
  onActionSelect,
  title = 'アクションを選択',
}: ActionBottomSheetProps) {
  const { categories, categorizedMap, actions } = useCategorizedActions();
  const [activeTab, setActiveTab] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const tabContainerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const ensureSheetState = useEffectEvent(() => {
    if (!isOpen) {
      if (activeTab !== 0) {
        setActiveTab(0);
      }

      if (direction !== 1) {
        setDirection(1);
      }

      return;
    }

    if (activeTab >= categories.length && categories.length > 0) {
      setActiveTab(0);
    }
  });

  useEffect(() => {
    ensureSheetState();
  }, [activeTab, categories.length, direction, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const container = tabContainerRef.current;
    const target = tabRefs.current[activeTab];

    if (!container || !target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeTab, isOpen]);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const canSwipeLeft = activeTab < categories.length - 1;
    const canSwipeRight = activeTab > 0;

    if (
      (offset.x < -SWIPE_THRESHOLD_PX || velocity.x < -SWIPE_VELOCITY_PX) &&
      canSwipeLeft
    ) {
      setDirection(1);
      setActiveTab(prev => Math.min(prev + 1, categories.length - 1));
      return;
    }

    if (
      (offset.x > SWIPE_THRESHOLD_PX || velocity.x > SWIPE_VELOCITY_PX) &&
      canSwipeRight
    ) {
      setDirection(-1);
      setActiveTab(prev => Math.max(prev - 1, 0));
    }
  };

  const handleTabClick = (index: number) => {
    if (index === activeTab) {
      return;
    }

    setDirection(index > activeTab ? 1 : -1);
    setActiveTab(index);
  };

  const handleActionClick = (action: ActionMaster) => {
    if (typeof action.id !== 'number') {
      return;
    }

    onActionSelect(action.id, action.name);
  };

  const handleFavoriteToggle = useCallback(
    async (event: MouseEvent<HTMLButtonElement>, action: ActionMaster) => {
      event.stopPropagation();

      if (typeof action.id !== 'number') {
        return;
      }

      try {
        const nextValue = !action.isFavorite;
        await db.actions_master.update(action.id, { isFavorite: nextValue });
      } catch (error) {
        console.error('Failed to toggle favorite', error);
        toast.error('お気に入りの更新に失敗しました');
      }
    },
    []
  );

  const handleClose = () => {
    onOpenChange(false);
  };

  const activeCategory = categories[activeTab];
  const activeActions = useMemo(
    () => (activeCategory ? categorizedMap.get(activeCategory.key) ?? [] : []),
    [activeCategory, categorizedMap]
  );
  const hasAnyActions = actions.length > 0;
  const isFavoriteTab = activeCategory?.key === FAVORITE_CATEGORY_KEY;
  const emptyMessage = isFavoriteTab
    ? 'まだお気に入りが登録されていません。カテゴリ一覧から⭐をタップして追加してください。'
    : 'このカテゴリに該当するアクションがありません。';

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-none border border-slate-800/60 bg-slate-950 p-0 text-slate-100 shadow-2xl"
    >
      <div className="flex h-full flex-1 flex-col">
        <header className="flex flex-col gap-1 px-6 pt-4 pb-3 text-left">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="sr-only">
            アクションカテゴリとタグの一覧から記録する項目を選択してください。
          </p>
        </header>

        <CategoryTabs
          categories={categories}
          activeTab={activeTab}
          onTabClick={handleTabClick}
          tabContainerRef={tabContainerRef}
          tabRefs={tabRefs}
        />

        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={activeCategory?.key ?? 'empty'}
              className="absolute inset-0 h-full w-full overflow-y-auto p-4"
              custom={direction}
              variants={categoryVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'tween', duration: 0.35 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
            >
              <ActionGrid
                actions={activeActions}
                hasAnyActions={hasAnyActions}
                emptyMessage={emptyMessage}
                onActionClick={handleActionClick}
                onFavoriteToggle={handleFavoriteToggle}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </BottomSheet>
  );
}
