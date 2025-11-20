'use client';

import { X, Plus } from 'lucide-react';
import { useState } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { MatchForm } from './parts/MatchForm';

export const CreateMatchModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> 新規作成
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-6">
        <div className="flex items-start justify-between gap-4">
          <DialogHeader className="text-left">
            <DialogTitle>新規試合を登録</DialogTitle>
            <DialogDescription>
              ホーム・アウェイと試合日、自チームを設定してください。
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <IconButton
              variant="ghost"
              srLabel="モーダルを閉じる"
              className="h-9 w-9 border-none text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </DialogClose>
        </div>

        <MatchForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
