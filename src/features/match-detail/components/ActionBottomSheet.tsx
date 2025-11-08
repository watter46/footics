'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { db, type ActionMaster } from '@/lib/db';
import { cn } from '@/lib/utils/cn';

// ... (CATEGORY_ORDER, useCategorizedActions などのフックは変更なし) ...
interface CategoryMeta {
  key: string;
  label: string;
}

const CATEGORY_ORDER: CategoryMeta[] = [
  { key: '攻撃', label: '🟩 攻撃' },
  { key: '守備', label: '🟥 守備' },
  { key: 'トランジション', label: '🟨 トランジション' },
  { key: 'イベント', label: '🟦 イベント' },
  { key: 'メンタル/その他', label: '⚪ メンタル' },
];

const swipeThreshold = 100;
const swipeVelocity = 500;

const categoryVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%' }),
  center: { x: '0%' },
  exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%' }),
};

function useCategorizedActions() {
  const actions = useLiveQuery(() => db.actions_master.toArray(), []);

  return useMemo(() => {
    const categorizedMap = new Map<string, ActionMaster[]>();
    CATEGORY_ORDER.forEach(meta => categorizedMap.set(meta.key, []));

    const safeActions: ActionMaster[] = actions ?? [];

    safeActions.forEach(action => {
      const key = CATEGORY_ORDER.find(
        meta => meta.key === action.category
      )?.key;
      const targetKey = key ?? action.category ?? 'その他';

      if (!categorizedMap.has(targetKey)) {
        categorizedMap.set(targetKey, []);
      }

      categorizedMap.get(targetKey)?.push(action);
    });

    return { categories: CATEGORY_ORDER, categorizedMap, actions: safeActions };
  }, [actions]);
}

interface ActionBottomSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onActionSelect: (actionId: number) => void;
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

  useEffect(() => {
    if (!isOpen) {
      setActiveTab(0);
      setDirection(1);
    } else if (activeTab >= categories.length) {
      setActiveTab(0);
    }
  }, [isOpen, categories.length, activeTab]);

  const handleDragEnd = (
    _event: any,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    const { offset, velocity } = info;
    const canSwipeLeft = activeTab < categories.length - 1;
    const canSwipeRight = activeTab > 0;

    if (
      (offset.x < -swipeThreshold || velocity.x < -swipeVelocity) &&
      canSwipeLeft
    ) {
      setDirection(1);
      setActiveTab(prev => Math.min(prev + 1, categories.length - 1));
    } else if (
      (offset.x > swipeThreshold || velocity.x > swipeVelocity) &&
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

  const handleActionClick = (actionId?: number) => {
    if (!actionId) {
      return;
    }
    onActionSelect(actionId);
  };

  const activeCategory = categories[activeTab];
  const activeActions = activeCategory
    ? categorizedMap.get(activeCategory.key) ?? []
    : [];
  const hasAnyActions = actions.length > 0;

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-none border border-slate-800/60 bg-slate-950 p-0 text-slate-100 shadow-2xl"
    >
      <div className="flex flex-col flex-1 h-full">
        <header className="flex flex-col gap-1 px-6 pb-3 pt-4 text-left">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="sr-only">
            アクションカテゴリとタグの一覧から記録する項目を選択してください。
          </p>
        </header>
        <div className="flex shrink-0 border-b border-slate-800/70 px-2">
          {categories.map((category, index) => (
            <button
              key={category.key}
              type="button"
              onClick={() => handleTabClick(index)}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                activeTab === index
                  ? 'border-b-2 border-sky-400 text-sky-300'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {category.label.split(' ')[1] ?? category.label}
            </button>
          ))}
        </div>

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
              {!hasAnyActions ? (
                <p className="pt-12 text-center text-sm text-slate-400">
                  アクションマスタが登録されていません。管理メニューから追加してください。
                </p>
              ) : activeActions.length === 0 ? (
                <p className="pt-12 text-center text-sm text-slate-400">
                  このカテゴリに該当するアクションがありません。
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {activeActions.map(action => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="h-auto py-3 text-sm"
                      onClick={() => handleActionClick(action.id)}
                    >
                      {action.name}
                    </Button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </BottomSheet>
  );
}
