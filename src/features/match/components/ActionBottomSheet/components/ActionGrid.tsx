import { type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { Star } from 'lucide-react';
import type { ActionMaster } from '@/lib/db';

interface ActionGridProps {
  actions: ActionMaster[];
  hasAnyActions: boolean;
  emptyMessage: string;
  onActionClick: (action: ActionMaster) => void;
  onFavoriteToggle: (event: MouseEvent<HTMLButtonElement>, action: ActionMaster) => void;
}

export const ActionGrid = ({
  actions,
  hasAnyActions,
  emptyMessage,
  onActionClick,
  onFavoriteToggle,
}: ActionGridProps) => {
  if (!hasAnyActions) {
    return (
      <p className="text-muted-foreground pt-12 text-center text-sm">
        アクションマスタが登録されていません。管理メニューから追加してください。
      </p>
    );
  }

  if (actions.length === 0) {
    return (
      <p className="text-muted-foreground pt-12 text-center text-sm">{emptyMessage}</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {actions.map(action => (
        <div
          key={action.id}
          className="bg-card/40 flex w-full items-center rounded-2xl border border-white/10 px-1 py-1 shadow-[0_0_25px_rgb(0_0_0/0.35)] backdrop-blur"
        >
          <Button
            variant="ghost"
            className="text-foreground hover:bg-primary/10 h-auto flex-1 justify-start rounded-2xl border-0 px-4 py-3 text-left text-sm"
            onClick={() => onActionClick(action)}
          >
            {action.name}
          </Button>
          <button
            type="button"
            aria-label={`${action.name} をお気に入りに${action.isFavorite ? '解除' : '追加'}`}
            aria-pressed={Boolean(action.isFavorite)}
            className={cn(
              'text-muted-foreground hover:border-primary/50 hover:text-foreground mr-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 transition-all',
              action.isFavorite &&
                'border-amber-400/60 bg-amber-400/10 text-amber-300 shadow-[0_0_15px_rgb(251_191_36/0.4)]'
            )}
            onClick={event => onFavoriteToggle(event, action)}
          >
            <Star
              className="h-4 w-4"
              fill={action.isFavorite ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      ))}
    </div>
  );
};
