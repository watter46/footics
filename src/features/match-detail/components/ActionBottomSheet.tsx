'use client';

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type MouseEvent,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { db, type ActionMaster } from '@/lib/db';
import { cn } from '@/lib/utils/cn';
import { Star } from 'lucide-react';
import { toast } from '@/features/toast/toast-store';

interface CategoryMeta {
  key: string;
  label: string;
}

const FAVORITE_CATEGORY_KEY = '__favorites__';

const CATEGORY_ORDER: CategoryMeta[] = [
  { key: '攻撃', label: '🟩 攻撃' },
  { key: '守備', label: '🟥 守備' },
  { key: 'トランジション', label: '🟨 トランジション' },
  { key: 'イベント', label: '🟦 イベント' },
  { key: 'メンタル/その他', label: '⚪ メンタル' },
];

const FAVORITE_CATEGORY: CategoryMeta = {
  key: FAVORITE_CATEGORY_KEY,
  label: '⭐ お気に入り',
};

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
    const categories: CategoryMeta[] = [
      FAVORITE_CATEGORY,
      ...CATEGORY_ORDER.map(meta => ({ ...meta })),
    ];
    const categorizedMap = new Map<string, ActionMaster[]>();
    categories.forEach(category => categorizedMap.set(category.key, []));

    const safeActions: ActionMaster[] = actions ?? [];

    safeActions.forEach(action => {
      if (action.isFavorite) {
        categorizedMap.get(FAVORITE_CATEGORY_KEY)?.push(action);
      }

      const orderedCategory = CATEGORY_ORDER.find(
        meta => meta.key === action.category
      );
      const targetKey = orderedCategory?.key ?? action.category ?? 'その他';

      if (!categorizedMap.has(targetKey)) {
        categorizedMap.set(targetKey, []);
        if (!categories.some(category => category.key === targetKey)) {
          categories.push({ key: targetKey, label: targetKey });
        }
      }

      categorizedMap.get(targetKey)?.push(action);
    });

    return { categories, categorizedMap, actions: safeActions };
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

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const canSwipeLeft = activeTab < categories.length - 1;
    const canSwipeRight = activeTab > 0;

    if (
      (offset.x < -swipeThreshold || velocity.x < -swipeVelocity) &&
      canSwipeLeft
    ) {
      setDirection(1);
      setActiveTab(prev => Math.min(prev + 1, categories.length - 1));
      return;
    }

    if (
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

  const activeCategory = categories[activeTab];
  const activeActions = activeCategory
    ? categorizedMap.get(activeCategory.key) ?? []
    : [];
  const hasAnyActions = actions.length > 0;
  const isFavoriteTab = activeCategory?.key === FAVORITE_CATEGORY_KEY;
  const emptyMessage = isFavoriteTab
    ? 'まだお気に入りが登録されていません。カテゴリ一覧から⭐をタップして追加してください。'
    : 'このカテゴリに該当するアクションがありません。';

  const handleClose = () => {
    onOpenChange(false);
  };

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
              {category.label}
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
                  {emptyMessage}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {activeActions.map(action => (
                    <div key={action.id} className="flex w-full items-center border">
                      <Button
                        variant="outline"
                        className="h-auto w-full border-0 py-3 text-left text-sm"
                        onClick={() => handleActionClick(action.id)}
                        key={action.id}
                      >
                        {action.name}
                      </Button>
                      <button
                        type="button"
                        aria-label={`${action.name} をお気に入りに${action.isFavorite ? '解除' : '追加'}`}
                        aria-pressed={Boolean(action.isFavorite)}
                        className={cn(
                          'rounded-full p-1 transition-colors',
                          action.isFavorite
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-500 hover:text-slate-300'
                        )}
                        onClick={event => handleFavoriteToggle(event, action)}
                      >
                        <Star
                          className="h-4 w-4"
                          fill={action.isFavorite ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>
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
