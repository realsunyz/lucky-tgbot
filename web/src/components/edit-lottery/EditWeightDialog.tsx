import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Participant, Prize } from "@/api/lottery";

interface EditWeightDialogProps {
  participant: Participant | null;
  prizes: Prize[];
  isSaving: boolean;
  onSave: (
    participant: Participant,
    globalWeight: number,
    prizeWeights: Record<number, number>,
  ) => Promise<boolean | undefined>;
  onClose: () => void;
}

export function EditWeightDialog({
  participant,
  prizes,
  isSaving,
  onSave,
  onClose,
}: EditWeightDialogProps) {
  const [newWeight, setNewWeight] = useState("1");
  const [prizeWeights, setPrizeWeights] = useState<Record<number, string>>({});

  // Reset form when participant changes
  useEffect(() => {
    if (participant) {
      setNewWeight(String(participant.weight));

      const initialPrizeWeights: Record<number, string> = {};
      prizes.forEach((prize) => {
        if (prize.id && participant.prize_weights?.[prize.id]) {
          initialPrizeWeights[prize.id] = String(
            participant.prize_weights[prize.id],
          );
        }
      });
      setPrizeWeights(initialPrizeWeights);
    }
  }, [participant, prizes]);

  const handleSave = async () => {
    if (!participant) return;

    const weight = parseInt(newWeight);
    const parsedPrizeWeights: Record<number, number> = {};

    for (const [prizeIdStr, weightStr] of Object.entries(prizeWeights)) {
      if (weightStr.trim() !== "") {
        const pw = parseInt(weightStr);
        if (!isNaN(pw) && pw >= 0) {
          parsedPrizeWeights[parseInt(prizeIdStr)] = pw;
        }
      }
    }

    const success = await onSave(participant, weight, parsedPrizeWeights);
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={!!participant} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑权重</DialogTitle>
          <DialogDescription>
            调整{" "}
            <span className="font-medium text-foreground">
              {participant?.username || participant?.first_name}
            </span>{" "}
            的中奖权重
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="py-4 space-y-6">
            {/* Global Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-base font-semibold">
                全局权重
              </Label>
              <Input
                id="weight"
                type="number"
                min={0}
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                所有奖品的默认权重。设为 0 则无法中奖。
              </p>
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold">独立奖品权重</Label>
              <p className="text-xs text-muted-foreground mb-4">
                特定奖品的独立权重。留空则使用全局权重。
              </p>

              <div className="space-y-4">
                {prizes.map((prize) => (
                  <div
                    key={prize.id}
                    className="grid grid-cols-4 items-center gap-4"
                  >
                    <Label className="col-span-2 truncate" title={prize.name}>
                      {prize.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        x{prize.quantity}
                      </span>
                    </Label>
                    <Input
                      className="col-span-2"
                      type="number"
                      placeholder={`全局 (${newWeight})`}
                      min={0}
                      value={prize.id ? prizeWeights[prize.id] || "" : ""}
                      onChange={(e) => {
                        if (prize.id) {
                          setPrizeWeights((prev) => ({
                            ...prev,
                            [prize.id!]: e.target.value,
                          }));
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存更改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
