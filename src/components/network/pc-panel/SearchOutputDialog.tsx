import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface SearchOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  labels: {
    searchOutputTitle: string;
    searchOutputDescription: string;
    searchPlaceholder: string;
    close: string;
  };
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export function SearchOutputDialog({
  open,
  onOpenChange,
  isDark,
  labels,
  searchQuery,
  onSearchQueryChange,
}: SearchOutputDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isDark ? 'bg-secondary-900 border-secondary-800 text-white' : 'bg-white'} sm:max-w-md`}>
        <DialogHeader>
          <DialogTitle>{labels.searchOutputTitle}</DialogTitle>
          <DialogDescription className={isDark ? 'text-secondary-200' : 'text-secondary-600'}>
            {labels.searchOutputDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="pr-9"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 text-secondary-200 hover:text-secondary-50 dark:hover:text-secondary-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={() => onOpenChange(false)} className="text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white">
            {labels.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
