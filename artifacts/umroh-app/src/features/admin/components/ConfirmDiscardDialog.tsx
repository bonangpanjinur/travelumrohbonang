import { TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function ConfirmDiscardDialog({ open, onKeepEditing, onDiscard }: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50 shrink-0">
              <TriangleAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </span>
            <AlertDialogTitle className="text-base">
              Tutup tanpa menyimpan?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pl-12">
            Perubahan yang belum disimpan akan hilang. Data yang sudah di-draft
            ke localStorage tetap tersimpan dan bisa dipulihkan nanti.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={onKeepEditing}>
            Lanjut Edit
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Ya, Tutup
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
