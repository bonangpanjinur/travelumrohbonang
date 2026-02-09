import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
}

const UpgradeDialog = ({ open, onOpenChange, featureName }: UpgradeDialogProps) => {
  const waMessage = encodeURIComponent(`Halo, saya tertarik untuk upgrade fitur "${featureName}" pada sistem travel umroh saya.`);
  const waLink = `https://wa.me/6281234567890?text=${waMessage}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center">Fitur Premium</DialogTitle>
          <DialogDescription className="text-center">
            Fitur <strong>{featureName}</strong> tersedia di paket Premium. Hubungi kami untuk upgrade sistem Anda dan dapatkan akses ke semua fitur canggih.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Tutup
          </Button>
          <Button asChild className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              Hubungi Kami via WhatsApp
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;
