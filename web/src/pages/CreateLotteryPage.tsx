import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorDisplay } from "@/components/ui/error-display";
import { LoadingDisplay } from "@/components/ui/loading-display";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Checkbox,
  CheckboxIndicator,
} from "@/components/animate-ui/primitives/radix/checkbox";
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
import { AlertCircle, Hash, Plus, Trash2, UserRoundPlus } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  getErrorMessage,
  VALIDATION_ERRORS,
  UI_MESSAGES,
  SUCCESS_MESSAGES,
} from "@/utils/errors";

interface PrizeInput {
  name: string;
  quantity: number;
}

function isAbortError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: string }).name === "AbortError"
  );
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
  const [isWeightsDisabled, setIsWeightsDisabled] = useState(false);
  const [isTosAgreed, setIsTosAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const controller = new AbortController();
      getLottery(id, controller.signal)
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
          if (data.is_weights_disabled)
            setIsWeightsDisabled(data.is_weights_disabled);
        })
        .catch((err) => {
          if (isAbortError(err)) return;
          setErrorMsg(getErrorMessage(err));
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoadingLottery(false);
          }
        });

      return () => controller.abort();
    }

    setIsLoadingLottery(false);
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
      toast.error(VALIDATION_ERRORS.PRIZE_COUNT_EXCEED(MAX_PRIZES_COUNT));
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
      setErrorMsg(VALIDATION_ERRORS.INVALID_CREATE_LINK);
      return;
    }

    if (!title.trim()) {
      setErrorMsg(VALIDATION_ERRORS.TITLE_REQUIRED);
      return;
    }
    if (title.length > MAX_TITLE_LENGTH) {
      setErrorMsg(VALIDATION_ERRORS.TITLE_TOO_LONG(MAX_TITLE_LENGTH));
      return;
    }

    if (description.length > MAX_DESC_LENGTH) {
      setErrorMsg(VALIDATION_ERRORS.DESC_TOO_LONG(MAX_DESC_LENGTH));
      return;
    }

    if (prizes.some((p) => !p.name.trim())) {
      setErrorMsg(VALIDATION_ERRORS.PRIZE_NAME_REQUIRED);
      return;
    }
    if (prizes.some((p) => p.name.length > MAX_PRIZE_NAME_LENGTH)) {
      setErrorMsg(
        VALIDATION_ERRORS.PRIZE_TITLE_TOO_LONG(MAX_PRIZE_NAME_LENGTH),
      );
      return;
    }
    if (prizes.some((p) => p.quantity < 1 || p.quantity > MAX_PRIZE_QUANTITY)) {
      setErrorMsg(VALIDATION_ERRORS.PRIZE_QTY_EXCEED(MAX_PRIZE_QUANTITY));
      return;
    }

    if (drawMode === "timed") {
      if (!date || isNaN(date.getTime())) {
        setErrorMsg(VALIDATION_ERRORS.DRAW_TIME_REQUIRED);
        return;
      }
      const now = new Date();
      if (date <= now) {
        setErrorMsg(VALIDATION_ERRORS.DRAW_TIME_PAST);
        return;
      }

      const maxDate = new Date();
      maxDate.setDate(now.getDate() + MAX_PRIZES_DURATION);
      if (date > maxDate) {
        setErrorMsg(
          VALIDATION_ERRORS.DRAW_TIME_FUTURE_LIMIT(MAX_PRIZES_DURATION),
        );
        return;
      }
    }

    if (drawMode === "full") {
      const parsedEntries = parseInt(maxEntries, 10);
      if (!maxEntries || isNaN(parsedEntries) || parsedEntries < 1) {
        setErrorMsg(VALIDATION_ERRORS.ENTRIES_INVALID);
        return;
      }
      if (parsedEntries > MAX_PRIZES_PARTICIPANTS) {
        setErrorMsg(VALIDATION_ERRORS.ENTRIES_EXCEED(MAX_PRIZES_PARTICIPANTS));
        return;
      }
    }

    if (!isTosAgreed) {
      setErrorMsg(VALIDATION_ERRORS.TOS_REQUIRED);
      return;
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
        max_entries: drawMode === "full" ? parseInt(maxEntries, 10) : undefined,
        prizes: validPrizes,
        creator_id: creatorId,
        is_weights_disabled: isWeightsDisabled,
      });

      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS);
      navigate(`/lottery/${id}`);
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingLottery) {
    return <LoadingDisplay />;
  }

  if (!id || !creatorId) {
    return (
      <ErrorDisplay
        title={UI_MESSAGES.LOAD_FAILED_TITLE}
        description={UI_MESSAGES.INVALID_LOTTERY_ID}
      />
    );
  }

  if (isNotDraft) {
    return (
      <ErrorDisplay
        title={UI_MESSAGES.LOAD_FAILED_TITLE}
        description={UI_MESSAGES.INVALID_LOTTERY_ID}
      />
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
                    <div key={index} className="flex gap-4 items-end">
                      <div className="flex-1 space-y-1.5">
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePrize(index)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">删除</span>
                        </Button>
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
                  <Separator />
                  <div className="flex items-start space-x-3 space-y-0">
                    <Checkbox
                      id="weights-disabled"
                      checked={isWeightsDisabled}
                      onCheckedChange={(checked) =>
                        setIsWeightsDisabled(checked as boolean)
                      }
                      className={cn(
                        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center",
                        "mt-1",
                      )}
                    >
                      <CheckboxIndicator className="size-3.5 text-current" />
                    </Checkbox>
                    <Label
                      htmlFor="weights-disabled"
                      className="cursor-pointer font-normal grid gap-1.5"
                    >
                      <span className="font-semibold">公平抽奖</span>
                      <span className="text-sm text-muted-foreground">
                        勾选后, 所有娱乐功能都将被禁用
                      </span>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <div className="sticky top-8 space-y-4">
                <div className="flex items-center justify-center space-x-2 px-1">
                  <Checkbox
                    id="tos"
                    checked={isTosAgreed}
                    onCheckedChange={(checked) =>
                      setIsTosAgreed(checked as boolean)
                    }
                    className="peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
                  >
                    <CheckboxIndicator className="size-3.5 text-current" />
                  </Checkbox>
                  <label
                    htmlFor="tos"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    我已阅读并同意{" "}
                    <Link
                      to="/tos"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      服务条款
                    </Link>
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || !isTosAgreed}
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
