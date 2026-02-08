import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Loader2, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { updateLottery, type LotteryResponse } from "@/api/lottery";
import { getErrorMessage } from "@/utils/errors";

interface DrawActionsProps {
  lottery: LotteryResponse;
  lotteryId: string;
  token: string;
  onDraw: () => Promise<boolean | undefined>;
  isDrawing: boolean;
  disabled: boolean;
  onUpdate: () => Promise<void>;
}

const MAX_PRIZES_DURATION = 14;
const MAX_PRIZES_PARTICIPANTS = 100;

const DRAW_MODE_LABELS: Record<string, { title: string; description: string }> =
  {
    manual: { title: "手动开奖", description: "由创建者手动触发开奖" },
    timed: { title: "定时开奖", description: "到达指定时间自动开奖" },
    full: { title: "满人开奖", description: "参与人数达标后自动开奖" },
  };

export function DrawActions({
  lottery,
  lotteryId,
  token,
  onDraw,
  isDrawing,
  disabled,
  onUpdate,
}: DrawActionsProps) {
  // Dialog/Drawer open state
  const [open, setOpen] = useState(false);

  // Draw mode edit state
  const [drawMode, setDrawMode] = useState(lottery.draw_mode);
  const [date, setDate] = useState<Date | undefined>(() => {
    if (lottery.draw_time) {
      return new Date(lottery.draw_time);
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0); // Default to 8 PM next day
    return d;
  });
  const [maxEntries, setMaxEntries] = useState(
    lottery.max_entries?.toString() || "",
  );
  const [isSaving, setIsSaving] = useState(false);

  // Button confirm state
  const [isConfirming, setIsConfirming] = useState(false);

  // Check if mobile
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDrawMode(lottery.draw_mode);
      if (lottery.draw_time) {
        setDate(new Date(lottery.draw_time));
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(20, 0, 0, 0);
        setDate(d);
      }
      setMaxEntries(lottery.max_entries?.toString() || "");
    }
  }, [open, lottery]);

  // Reset confirmation
  useEffect(() => {
    setIsConfirming(false);
  }, []);

  const currentModeInfo = DRAW_MODE_LABELS[lottery.draw_mode];

  const getDrawTimeDisplay = () => {
    if (lottery.draw_mode === "timed" && lottery.draw_time) {
      return format(new Date(lottery.draw_time), "PPP HH:mm", { locale: zhCN });
    }
    if (lottery.draw_mode === "full" && lottery.max_entries) {
      return `${lottery.max_entries} 人`;
    }
    return null;
  };

  const handleSaveSettings = async () => {
    // Validate
    if (drawMode === "timed") {
      if (!date) {
        toast.error("请选择开奖时间");
        return;
      }
      if (date <= new Date()) {
        toast.error("开奖时间不得早于当前时间");
        return;
      }
    }
    if (drawMode === "full") {
      const entries = parseInt(maxEntries);
      if (!entries || entries < 1) {
        toast.error("请设置有效的满人数量");
        return;
      }
      if (entries > MAX_PRIZES_PARTICIPANTS) {
        toast.error(`最高人数不得超过 ${MAX_PRIZES_PARTICIPANTS} 人`);
        return;
      }
    }

    setIsSaving(true);
    try {
      let drawTimeISO: string | undefined;
      if (drawMode === "timed" && date) {
        drawTimeISO = date.toISOString();
      }

      await updateLottery(lotteryId, token, {
        draw_mode: drawMode,
        draw_time: drawTimeISO,
        max_entries: drawMode === "full" ? parseInt(maxEntries) : undefined,
      });

      toast.success("开奖设置已更新");
      setOpen(false);
      await onUpdate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrawClick = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      setTimeout(() => setIsConfirming(false), 3000);
      return;
    }

    const success = await onDraw();
    if (success) {
      setIsConfirming(false);
    }
  };

  // Draw mode selection form content (as JSX variable to prevent re-mount)
  const drawModeFormContent = (
    <div className="space-y-4">
      <RadioGroup
        value={drawMode}
        onValueChange={(v) => setDrawMode(v as typeof drawMode)}
      >
        <div className="flex items-start space-x-3 space-y-0">
          <RadioGroupItem value="manual" id="edit-manual" className="mt-1" />
          <Label
            htmlFor="edit-manual"
            className="cursor-pointer font-normal grid gap-1"
          >
            <span className="font-semibold">手动开奖</span>
            <span className="text-sm text-muted-foreground">
              由创建者手动触发开奖
            </span>
          </Label>
        </div>
        <Separator />
        <div className="flex items-start space-x-3 space-y-0">
          <RadioGroupItem value="timed" id="edit-timed" className="mt-1" />
          <Label
            htmlFor="edit-timed"
            className="cursor-pointer font-normal grid gap-1"
          >
            <span className="font-semibold">定时开奖</span>
            <span className="text-sm text-muted-foreground">
              到达指定时间自动开奖
            </span>
          </Label>
        </div>
        {drawMode === "timed" && (
          <div className="pl-7 pt-2 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">选择开奖时间</Label>
              <DateTimePicker
                date={date}
                setDate={setDate}
                disabled={(d) => {
                  const now = new Date();
                  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
                  if (d < startOfToday) return true;

                  const maxDate = new Date();
                  maxDate.setDate(new Date().getDate() + MAX_PRIZES_DURATION);
                  const endOfMaxDate = new Date(
                    maxDate.setHours(23, 59, 59, 999),
                  );
                  return d > endOfMaxDate;
                }}
              />
            </div>
          </div>
        )}
        <Separator />
        <div className="flex items-start space-x-3 space-y-0">
          <RadioGroupItem value="full" id="edit-full" className="mt-1" />
          <Label
            htmlFor="edit-full"
            className="cursor-pointer font-normal grid gap-1"
          >
            <span className="font-semibold">满人开奖</span>
            <span className="text-sm text-muted-foreground">
              参与人数达标后自动开奖
            </span>
          </Label>
        </div>
        {drawMode === "full" && (
          <div className="pl-7 pt-2">
            <Label htmlFor="edit-maxEntries" className="text-xs mb-1.5 block">
              设置人数
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-maxEntries"
                type="number"
                min={1}
                value={maxEntries}
                onChange={(e) => setMaxEntries(e.target.value)}
                placeholder="10"
                max={MAX_PRIZES_PARTICIPANTS}
                className={cn(
                  "w-24",
                  parseInt(maxEntries) > MAX_PRIZES_PARTICIPANTS &&
                    "border-destructive focus-visible:ring-destructive",
                )}
              />
              <span
                className={cn(
                  "text-sm",
                  parseInt(maxEntries) > MAX_PRIZES_PARTICIPANTS
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                人
              </span>
            </div>
          </div>
        )}
      </RadioGroup>
    </div>
  );

  // Save button (as JSX variable to prevent re-mount)
  const saveButtonContent = (
    <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      保存设置
    </Button>
  );

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>管理操作</CardTitle>
        <CardDescription>修改开奖方式</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Draw Mode Display */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{currentModeInfo?.title}</p>
              {getDrawTimeDisplay() && (
                <p className="text-sm text-muted-foreground">
                  {getDrawTimeDisplay()}
                </p>
              )}
            </div>
          </div>

          {/* Desktop: Dialog */}
          {!isMobile ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  修改
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>修改开奖方式</DialogTitle>
                  <DialogDescription>
                    选择新的开奖方式并保存设置
                  </DialogDescription>
                </DialogHeader>
                {drawModeFormContent}
                <DialogFooter>{saveButtonContent}</DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            /* Mobile: Drawer */
            <Drawer.Root
              open={open}
              onOpenChange={setOpen}
              repositionInputs={false}
            >
              <Drawer.Trigger asChild>
                <Button variant="outline" size="sm">
                  修改
                </Button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="bg-background flex flex-col rounded-t-2xl h-fit fixed bottom-0 left-0 right-0 z-50 outline-none">
                  <div className="p-4 bg-background rounded-t-2xl flex-1">
                    <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mb-4" />
                    <Drawer.Title className="text-lg font-semibold mb-1">
                      修改开奖方式
                    </Drawer.Title>
                    <Drawer.Description className="text-sm text-muted-foreground mb-6">
                      选择新的开奖方式并保存设置
                    </Drawer.Description>
                    {drawModeFormContent}
                    <div className="mt-6 pb-4">{saveButtonContent}</div>
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          )}
        </div>

        <Separator />

        {/* Draw Button */}
        <Button
          size="lg"
          variant={isConfirming ? "destructive" : "default"}
          disabled={isDrawing || disabled}
          onClick={handleDrawClick}
          className="w-full h-12 font-bold transition-all duration-300"
        >
          {isDrawing ? "开奖中..." : isConfirming ? "确认开奖" : "立即开奖"}
        </Button>
      </CardContent>
    </Card>
  );
}
