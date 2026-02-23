import { useState, useRef, useEffect } from "react";
import { toast } from "@/components/ui/sonner";
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
  ResponsiveDrawer as Dialog,
  ResponsiveDrawerContent as DialogContent,
  ResponsiveDrawerDescription as DialogDescription,
  ResponsiveDrawerFooter as DialogFooter,
  ResponsiveDrawerHeader as DialogHeader,
  ResponsiveDrawerTitle as DialogTitle,
} from "../ui/responsive-drawer";

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
import { Plus, Trash2, Loader2, Check, X } from "lucide-react";
import { updateLottery, type Prize, type LotteryResponse } from "@/api/lottery";
import { getErrorMessage } from "@/utils/errors";
import { cn } from "@/lib/utils";

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
    if (name.length > 10) {
      toast.error("奖品名称不得超过 10 字");
      return;
    }
    if (isNaN(quantity) || quantity < 1) {
      toast.error("请输入有效的奖品数量");
      return;
    }
    if (quantity > 20) {
      toast.error("奖品数量不得超过 20 个");
      return;
    }

    setIsSaving(true);
    try {
      const currentPrizes = [...(lottery.prizes || [])];
      currentPrizes.push({ name, quantity });

      await updateLottery(lotteryId, token, {
        prizes: currentPrizes,
      });

      toast.success("奖品添加成功");
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
    if (updatedPrize.name.length > 10) {
      toast.error("奖品名称不得超过 10 字");
      return;
    }
    if (updatedPrize.quantity < 1) {
      toast.error("奖品数量必须大于 0");
      return;
    }
    if (updatedPrize.quantity > 20) {
      toast.error("奖品数量不得超过 20 个");
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
      toast.success("奖品删除成功");
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
                      {deletingIndex === index ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleDelete}
                          >
                            <Check className="h-4 w-4" />
                            <span className="sr-only">确认删除</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setDeletingIndex(null)}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">取消</span>
                          </Button>
                        </div>
                      ) : (
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
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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
                  {deletingIndex === index ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDelete}
                      >
                        <Check className="w-4 h-4" />
                        <span className="sr-only">确认删除</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setDeletingIndex(null)}
                      >
                        <X className="w-4 h-4" />
                        <span className="sr-only">取消</span>
                      </Button>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加奖品</DialogTitle>
            <DialogDescription>添加一个新的奖品到抽奖中</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pb-4 pt-2">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <Label htmlFor="prize-name">奖品名称</Label>
                <span
                  className={cn(
                    "text-xs",
                    prizeName.length > 10
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {prizeName.length}/10
                </span>
              </div>
              <Input
                id="prize-name"
                value={prizeName}
                onChange={(e) => setPrizeName(e.target.value)}
                placeholder="必填, 最多 10 字"
                className={cn(
                  prizeName.length > 10 &&
                    "border-destructive focus-visible:ring-destructive",
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prize-quantity">数量</Label>
              <Input
                id="prize-quantity"
                type="number"
                min={1}
                max={20}
                value={prizeQuantity}
                onChange={(e) => setPrizeQuantity(e.target.value)}
                placeholder="1"
                className={cn(
                  parseInt(prizeQuantity) > 20 &&
                    "border-destructive focus-visible:ring-destructive",
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveNew}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        className={cn(
          "h-8",
          currentValue.length > 10 &&
            "border-destructive focus-visible:ring-destructive",
        )}
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
        toast.error("奖品数量不能超过 20");
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
        className={cn(
          "h-7 w-20 text-center text-base font-mono mx-auto",
          parseInt(currentValue) > 20 &&
            "border-destructive focus-visible:ring-destructive",
        )}
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
