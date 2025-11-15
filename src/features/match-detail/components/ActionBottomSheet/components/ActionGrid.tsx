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
      <p className="pt-12 text-center text-sm text-slate-400">
        アクションマスタが登録されていません。管理メニューから追加してください。
      </p>
    );
  }

  if (actions.length === 0) {
    return (
      <p className="pt-12 text-center text-sm text-slate-400">{emptyMessage}</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {actions.map(action => (
        <div key={action.id} className="flex w-full items-center border">
          <Button
            variant="outline"
            className="h-auto w-full border-0 py-3 text-left text-sm"
            onClick={() => onActionClick(action)}
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
