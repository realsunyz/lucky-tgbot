import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { updateLottery, type Prize, type LotteryResponse } from "@/api/lottery";
import { getErrorMessage } from "@/utils/errors";

interface PrizesCardProps {
  lottery: LotteryResponse;
  lotteryId: string;
  token: string;
  onUpdate: () => Promise<void>;
}

export function PrizesCard({
  lottery,
  lotteryId,
  token,
  onUpdate,
}: PrizesCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [prizeName, setPrizeName] = useState("");
  const [prizeQuantity, setPrizeQuantity] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const resetForm = () => {
    setPrizeName("");
    setPrizeQuantity("1");
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSaveNew = async () => {
    const name = prizeName.trim();
    const quantity = parseInt(prizeQuantity);

    if (!name) {
      toast.error("请输入奖品名称");
      return;
    }
    if (isNaN(quantity) || quantity < 1) {
      toast.error("请输入有效的奖品数量");
      return;
    }

    setIsSaving(true);
    try {
      const currentPrizes = [...(lottery.prizes || [])];
      currentPrizes.push({ name, quantity });

      await updateLottery(lotteryId, token, {
        prizes: currentPrizes,
      });

      toast.success("奖品已添加");
      await onUpdate();
      setIsDialogOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePrize = async (index: number, updates: Partial<Prize>) => {
    const currentPrizes = [...(lottery.prizes || [])];
    const updatedPrize = { ...currentPrizes[index], ...updates };

    // Validate
    if (!updatedPrize.name.trim()) {
      toast.error("奖品名称不能为空");
      return;
    }
    if (updatedPrize.quantity < 1) {
      toast.error("数量必须大于 0");
      return;
    }

    // Check if changed
    if (
      currentPrizes[index].name === updatedPrize.name &&
      currentPrizes[index].quantity === updatedPrize.quantity
    ) {
      return;
    }

    currentPrizes[index] = updatedPrize;

    try {
      await updateLottery(lotteryId, token, {
        prizes: currentPrizes,
      });
      toast.success("奖品已更新");
      await onUpdate();
    } catch (err) {
      toast.error(getErrorMessage(err));
      // Revert optimization logic if needed, but for now we rely on re-fetch
    }
  };

  const handleDelete = async () => {
    if (deletingIndex === null) return;

    const currentPrizes = [...(lottery.prizes || [])];
    if (currentPrizes.length <= 1) {
      toast.error("至少需要保留一个奖品");
      setDeletingIndex(null);
      return;
    }

    try {
      const newPrizes = currentPrizes.filter((_, i) => i !== deletingIndex);
      await updateLottery(lotteryId, token, {
        prizes: newPrizes,
      });
      toast.success("奖品已删除");
      await onUpdate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingIndex(null);
    }
  };

  return (
    <>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>奖品列表</CardTitle>
          <CardDescription>管理本次抽奖的奖品设置</CardDescription>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAdd}
              className="gap-1 h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                添加奖品
              </span>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden sm:block rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full pl-4">名称</TableHead>
                  <TableHead className="w-[140px] whitespace-nowrap text-center">
                    数量
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap pr-4">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lottery.prizes || []).map((prize, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-4">
                      <div className="text-sm">
                        <InlineTextEdit
                          value={prize.name}
                          onSave={(val) =>
                            handleUpdatePrize(index, { name: val })
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      <InlineNumberEdit
                        value={prize.quantity}
                        onSave={(val) =>
                          handleUpdatePrize(index, { quantity: val })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingIndex(index)}
                        disabled={(lottery.prizes || []).length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">删除</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {(lottery.prizes || []).map((prize, index) => (
              <div
                key={index}
                className="px-3 py-2 border rounded-lg bg-card flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    <InlineTextEdit
                      value={prize.name}
                      onSave={(val) => handleUpdatePrize(index, { name: val })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <InlineNumberEdit
                    value={prize.quantity}
                    onSave={(val) =>
                      handleUpdatePrize(index, { quantity: val })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeletingIndex(index)}
                    disabled={(lottery.prizes || []).length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">删除</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Prize Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加奖品</DialogTitle>
            <DialogDescription>添加一个新的奖品项到抽奖中</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prize-name">奖品名称</Label>
              <Input
                id="prize-name"
                value={prizeName}
                onChange={(e) => setPrizeName(e.target.value)}
                placeholder="例如: iPhone 15 Pro"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prize-quantity">数量</Label>
              <Input
                id="prize-quantity"
                type="number"
                min={1}
                value={prizeQuantity}
                onChange={(e) => setPrizeQuantity(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button onClick={handleSaveNew} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={deletingIndex !== null}
        onOpenChange={(open) => !open && setDeletingIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除奖品？</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除该奖品吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingIndex(null)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Inline Text Editor
function InlineTextEdit({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue.trim() !== value) {
      onSave(currentValue);
    } else {
      setCurrentValue(value); // reset if specific checks failed inside onSave or just plain no-change
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-8"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-text hover:underline decoration-dashed underline-offset-4 decoration-muted-foreground/50 py-1"
    >
      {value}
    </div>
  );
}

// Inline Number Editor (similar to ParticipantsTable)
function InlineNumberEdit({
  value,
  onSave,
}: {
  value: number;
  onSave: (val: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(value.toString());
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseInt(currentValue);
    if (!isNaN(num) && num > 0 && num <= 20 && num !== value) {
      onSave(num);
    } else {
      if (num > 20) {
        toast.error("数量不能超过 20");
      }
      setCurrentValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setCurrentValue(value.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        min={1}
        max={20}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-7 w-20 text-center text-base font-mono mx-auto"
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="h-7 px-2 text-sm font-mono rounded-md border border-border bg-transparent hover:bg-accent transition-colors cursor-text min-w-16"
    >
      {value}
    </button>
  );
}
