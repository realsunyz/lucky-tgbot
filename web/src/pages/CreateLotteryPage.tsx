import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  createLottery,
  getLottery,
  type Prize as PrizeType,
} from "@/api/lottery";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Hash,
  Loader2,
  Plus,
  Trash2,
  TriangleAlert,
  UserRoundPlus,
} from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";

interface PrizeInput {
  name: string;
  quantity: number;
}

export default function CreateLotteryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [creatorId, setCreatorId] = useState<number | null>(null);
  const [isLoadingLottery, setIsLoadingLottery] = useState(true);
  const [isNotDraft, setIsNotDraft] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [drawMode, setDrawMode] = useState<"timed" | "full" | "manual">(
    "manual",
  );
  const [date, setDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    return d;
  });
  const [maxEntries, setMaxEntries] = useState("");
  const [prizes, setPrizes] = useState<PrizeInput[]>([
    { name: "", quantity: 1 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getLottery(id)
        .then((data) => {
          if (data.status !== "draft") {
            setIsNotDraft(true);
            setIsLoadingLottery(false);
            return;
          }
          setCreatorId(data.creator_id);
          // Optional: Prefill if editing a draft that has data
          if (data.title) setTitle(data.title);
          if (data.description) setDescription(data.description);
          if (data.draw_mode) setDrawMode(data.draw_mode);
          if (data.max_entries) setMaxEntries(data.max_entries.toString());
          if (data.draw_time) {
            setDate(new Date(data.draw_time));
          }
          if (data.prizes && data.prizes.length > 0) {
            setPrizes(
              data.prizes.map((p) => ({ name: p.name, quantity: p.quantity })),
            );
          }
        })
        .catch((err) => {
          console.error(err);
          setErrorMsg("获取抽奖信息失败");
        })
        .finally(() => {
          setIsLoadingLottery(false);
        });
    }
  }, [id]);

  const MAX_TITLE_LENGTH = 20;
  const MAX_DESC_LENGTH = 100;
  const MAX_PRIZE_NAME_LENGTH = 10;
  const MAX_PRIZE_QUANTITY = 20;
  const MAX_PRIZES_COUNT = 10;
  const MAX_PRIZES_DURATION = 14;
  const MAX_PRIZES_PARTICIPANTS = 100;

  const addPrize = () => {
    if (prizes.length >= MAX_PRIZES_COUNT) {
      toast.error(`最多添加 ${MAX_PRIZES_COUNT} 个奖品`);
      return;
    }
    setPrizes([...prizes, { name: "", quantity: 1 }]);
  };

  const removePrize = (index: number) => {
    if (prizes.length > 1) {
      setPrizes(prizes.filter((_, i) => i !== index));
    }
  };

  const updatePrize = (
    index: number,
    field: keyof PrizeInput,
    value: string | number,
  ) => {
    const updated = [...prizes];
    if (field === "quantity") {
      updated[index][field] = Number(value);
    } else {
      updated[index][field] = value as string;
    }
    setPrizes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!id || !creatorId) {
      setErrorMsg("无效的创建链接");
      return;
    }

    if (!title.trim()) {
      setErrorMsg("请填写抽奖名称");
      return;
    }
    if (title.length > MAX_TITLE_LENGTH) {
      setErrorMsg(`抽奖标题不得超过 ${MAX_TITLE_LENGTH} 字`);
      return;
    }

    if (description.length > MAX_DESC_LENGTH) {
      setErrorMsg(`抽奖详情不得超过 ${MAX_DESC_LENGTH} 字`);
      return;
    }

    if (prizes.some((p) => !p.name.trim())) {
      setErrorMsg("请填写奖品名称");
      return;
    }
    if (prizes.some((p) => p.name.length > MAX_PRIZE_NAME_LENGTH)) {
      setErrorMsg(`奖品名称不得超过 ${MAX_PRIZE_NAME_LENGTH} 字`);
      return;
    }
    if (prizes.some((p) => p.quantity < 1 || p.quantity > MAX_PRIZE_QUANTITY)) {
      setErrorMsg(
        `奖品数量不得超过 ${MAX_PRIZE_QUANTITY} 个, 请勿尝试绕过限制`,
      );
      return;
    }

    if (drawMode === "timed") {
      if (!date) {
        setErrorMsg("请选择开奖时间");
        return;
      }
      const now = new Date();
      if (date <= now) {
        setErrorMsg("开奖时间不得早于当前时间");
        return;
      }

      const maxDate = new Date();
      maxDate.setDate(now.getDate() + MAX_PRIZES_DURATION);
      if (date > maxDate) {
        setErrorMsg(
          `开奖时间不得晚于 ${MAX_PRIZES_DURATION} 天后, 请勿尝试绕过限制`,
        );
        return;
      }
    }

    if (drawMode === "full") {
      if (!maxEntries || parseInt(maxEntries) < 1) {
        setErrorMsg("无效的满人数量");
        return;
      }
      if (parseInt(maxEntries) > MAX_PRIZES_PARTICIPANTS) {
        setErrorMsg(
          `最高人数不得超过 ${MAX_PRIZES_PARTICIPANTS} 人, 请勿尝试绕过限制`,
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const validPrizes: PrizeType[] = prizes
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim(), quantity: p.quantity }));

      let drawTimeISO: string | undefined;
      if (drawMode === "timed" && date) {
        drawTimeISO = date.toISOString();
      }

      await createLottery(id, {
        title: title.trim(),
        description: description.trim(),
        draw_mode: drawMode,
        draw_time: drawTimeISO,
        max_entries: drawMode === "full" ? parseInt(maxEntries) : undefined,
        prizes: validPrizes,
        creator_id: creatorId,
      });

      toast.success("抽奖创建成功！");
      navigate(`/lottery/${id}`);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "创建失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingLottery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!id || !creatorId) {
    return (
      <div className="flex-1 w-full flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>无效链接</AlertTitle>
          <AlertDescription>
            请从 Telegram Bot 获取有效的创建链接或确保抽奖 ID 正确
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isNotDraft) {
    return (
      <div className="flex-1 w-full flex items-center justify-center bg-background p-4">
        <Alert className="w-full max-w-md border-yellow-500/50 text-yellow-600 dark:text-yellow-500 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-500">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>无法编辑</AlertTitle>
          <AlertDescription>该抽奖已创建，无法再次编辑</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 flex justify-center w-full">
      <div className="w-full max-w-6xl space-y-6">
        <div className="text-center sm:text-left space-y-2">
          <h1 className="text-3xl font-bold">创建新抽奖</h1>
          <div className="text-muted-foreground flex flex-wrap gap-4 sm:gap-6 justify-center items-center sm:justify-start text-sm">
            <span className="flex items-center gap-1.5">
              <Hash className="w-4 h-4" />
              <span>
                编号{" "}
                <span className="font-mono text-primary font-medium">{id}</span>
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <UserRoundPlus className="w-4 h-4" />
              <span>
                发布者{" "}
                <span className="font-mono text-primary font-medium">
                  {creatorId}
                </span>
              </span>
            </span>
          </div>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>基本信息</CardTitle>
                  <CardDescription>设置抽奖的标题和详细说明</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="title">标题</Label>
                      <span
                        className={cn(
                          "text-xs",
                          title.length > MAX_TITLE_LENGTH
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {title.length}/{MAX_TITLE_LENGTH}
                      </span>
                    </div>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="必填, 最多 20 字"
                      className={cn(
                        title.length > MAX_TITLE_LENGTH &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="description">详情</Label>
                      <span
                        className={cn(
                          "text-xs",
                          description.length > MAX_DESC_LENGTH
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {description.length}/{MAX_DESC_LENGTH}
                      </span>
                    </div>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="选填, 最多 100 字"
                      rows={5}
                      className={cn(
                        description.length > MAX_DESC_LENGTH &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>奖品设置</CardTitle>
                  <CardDescription>添加至少一个奖品, 至多十个</CardDescription>
                  <CardAction>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPrize}
                      disabled={prizes.length >= MAX_PRIZES_COUNT}
                      className="gap-1 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      添加奖品
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {prizes.map((prize, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between">
                          <Label className="text-xs text-muted-foreground">
                            奖品名称
                          </Label>
                          <span
                            className={cn(
                              "text-[10px]",
                              prize.name.length > MAX_PRIZE_NAME_LENGTH
                                ? "text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            {prize.name.length}/{MAX_PRIZE_NAME_LENGTH}
                          </span>
                        </div>
                        <Input
                          value={prize.name}
                          onChange={(e) =>
                            updatePrize(index, "name", e.target.value)
                          }
                          placeholder="必填, 最多 10 字"
                          className={cn(
                            prize.name.length > MAX_PRIZE_NAME_LENGTH &&
                              "border-destructive focus-visible:ring-destructive",
                          )}
                        />
                      </div>
                      <div className="w-24 space-y-1.5">
                        <Label className="text-xs text-muted-foreground block">
                          数量
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={MAX_PRIZE_QUANTITY}
                          value={prize.quantity === 0 ? "" : prize.quantity}
                          onChange={(e) =>
                            updatePrize(index, "quantity", e.target.value)
                          }
                          className={cn(
                            prize.quantity > MAX_PRIZE_QUANTITY &&
                              "border-destructive focus-visible:ring-destructive",
                          )}
                        />
                      </div>
                      {prizes.length > 1 && (
                        <div className="pt-7">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePrize(index)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">删除</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Settings & Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>开奖设置</CardTitle>
                  <CardDescription>选择开奖方式</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup
                    value={drawMode}
                    onValueChange={(v) => setDrawMode(v as typeof drawMode)}
                  >
                    <div className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem
                        value="manual"
                        id="manual"
                        className="mt-1"
                      />
                      <Label
                        htmlFor="manual"
                        className="cursor-pointer font-normal grid gap-1.5"
                      >
                        <span className="font-semibold">手动开奖</span>
                        <span className="text-sm text-muted-foreground">
                          由创建者手动触发开奖
                        </span>
                      </Label>
                    </div>
                    <Separator />
                    <div className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem
                        value="timed"
                        id="timed"
                        className="mt-1"
                      />
                      <Label
                        htmlFor="timed"
                        className="cursor-pointer font-normal grid gap-1.5"
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
                              const startOfToday = new Date(
                                now.setHours(0, 0, 0, 0),
                              );
                              if (d < startOfToday) return true;

                              const maxDate = new Date();
                              maxDate.setDate(
                                new Date().getDate() + MAX_PRIZES_DURATION,
                              );
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
                      <RadioGroupItem value="full" id="full" className="mt-1" />
                      <Label
                        htmlFor="full"
                        className="cursor-pointer font-normal grid gap-1.5"
                      >
                        <span className="font-semibold">满人开奖</span>
                        <span className="text-sm text-muted-foreground">
                          参与人数达标后自动开奖
                        </span>
                      </Label>
                    </div>
                    {drawMode === "full" && (
                      <div className="pl-7 pt-2">
                        <Label
                          htmlFor="maxEntries"
                          className="text-xs mb-1.5 block"
                        >
                          设置人数
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="maxEntries"
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
                </CardContent>
              </Card>

              <div className="sticky top-8 space-y-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-6 text-lg shadow-lg font-bold"
                  size="lg"
                >
                  {isSubmitting ? "创建中..." : "发布抽奖"}
                </Button>
                <p className="text-center text-xs text-muted-foreground px-4">
                  抽奖详情及链接将自动发送至您的 Telegram 聊天中
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
