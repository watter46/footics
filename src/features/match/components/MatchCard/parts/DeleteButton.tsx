import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Trash2 } from "lucide-react";
import { AlertDialogFooter, AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteButtonProps {
  matchId?: number;
  onDelete: (id: number) => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteButton = ({ matchId, onDelete, isDeleting }: DeleteButtonProps) => {
  return (
    <>
    { matchId && (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <IconButton
            variant="ghost"
            srLabel="試合を削除"
            className="text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
          </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>試合を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は一覧から非表示にしますが、データは保持されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="ghost">キャンセル</Button></AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => onDelete(matchId!)}
                disabled={isDeleting}
              >
                {isDeleting ? '削除中...' : '削除する'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    </>
  )
}
