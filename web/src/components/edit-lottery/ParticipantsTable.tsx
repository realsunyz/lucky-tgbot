import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveDrawer as Dialog,
  ResponsiveDrawerContent as DialogContent,
  ResponsiveDrawerDescription as DialogDescription,
  ResponsiveDrawerHeader as DialogHeader,
  ResponsiveDrawerTitle as DialogTitle,
  ResponsiveDrawerFooter as DialogFooter,
} from "@/components/ui/responsive-drawer";
import {
  Trash2,
  Settings2,
  Search,
  Plus,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import type { Participant, Prize } from "@/api/lottery";
import {
  updateParticipantWeight,
  updatePrizeWeight,
  deletePrizeWeight,
  addParticipant,
} from "@/api/lottery";
import { getErrorMessage } from "@/utils/errors";

interface ParticipantsTableProps {
  participants: Participant[];
  prizes: Prize[];
  lotteryId: string;
  token: string;
  onDelete: (participant: Participant) => Promise<void>;
  onDataUpdate: () => Promise<void>;
  isWeightsDisabled?: boolean;
}

export function ParticipantsTable({
  participants,
  prizes,
  lotteryId,
  token,
  onDelete,
  onDataUpdate,
  isWeightsDisabled,
}: ParticipantsTableProps) {
  const [deletingParticipant, setDeletingParticipant] =
    useState<Participant | null>(null);
  const [weightEditingParticipant, setWeightEditingParticipant] =
    useState<Participant | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN");
  };

  const handleConfirmDelete = async () => {
    if (deletingParticipant) {
      await onDelete(deletingParticipant);
      setDeletingParticipant(null);
    }
  };

  return (
    <>
      <Card className="gap-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>参与者列表</CardTitle>
            <CardDescription>
              {isWeightsDisabled
                ? "查看所有参与用户"
                : "查看所有参与用户并修改权重"}
            </CardDescription>
          </div>
          {!isWeightsDisabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddUserOpen(true)}
              className="h-8 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                添加用户
              </span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <p>暂无参与者</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-full pl-4">用户</TableHead>
                      <TableHead className="whitespace-nowrap">
                        加入时间
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap pr-4">
                        操作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((p) => (
                      <TableRow key={p.user_id}>
                        <TableCell className="pl-4">
                          <UserDisplay participant={p} mobile={false} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(p.joined_at)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1 items-center">
                            {!isWeightsDisabled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={() => setWeightEditingParticipant(p)}
                              >
                                <Settings2 className="w-4 h-4" />
                              </Button>
                            )}
                            {deletingParticipant?.user_id === p.user_id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={handleConfirmDelete}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => setDeletingParticipant(null)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingParticipant(p)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.user_id}
                    className="px-3 py-2 border rounded-lg bg-card flex items-center justify-between gap-2"
                  >
                    <UserDisplay participant={p} mobile />
                    <div className="flex items-center gap-1 shrink-0">
                      {!isWeightsDisabled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => setWeightEditingParticipant(p)}
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      )}
                      {deletingParticipant?.user_id === p.user_id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleConfirmDelete}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setDeletingParticipant(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletingParticipant(p)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Prize Weight Edit Dialog/Drawer */}
      <Dialog
        open={!!weightEditingParticipant}
        onOpenChange={(open) => !open && setWeightEditingParticipant(null)}
      >
        <DialogContent
          className="max-w-md max-h-[80vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>设置奖品权重</DialogTitle>
            <DialogDescription>
              为用户{" "}
              <span className="font-medium text-foreground">
                {weightEditingParticipant?.username ||
                  weightEditingParticipant?.first_name ||
                  weightEditingParticipant?.user_id}
              </span>{" "}
              设置特定奖品的权重
            </DialogDescription>
          </DialogHeader>
          <PrizeWeightEditor
            participant={weightEditingParticipant}
            prizes={prizes}
            lotteryId={lotteryId}
            token={token}
            onUpdate={onDataUpdate}
          />
        </DialogContent>
      </Dialog>

      <AddParticipantDialog
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        lotteryId={lotteryId}
        token={token}
        onSuccess={onDataUpdate}
      />
    </>
  );
}

function PrizeWeightEditor({
  participant,
  prizes,
  lotteryId,
  token,
  onUpdate,
}: {
  participant: Participant | null;
  prizes: Prize[];
  lotteryId: string;
  token: string;
  onUpdate: () => Promise<void>;
}) {
  const [activePrizeIds, setActivePrizeIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize active prizes based on existing weights
  useEffect(() => {
    if (participant && participant.prize_weights) {
      // Only show prizes with weights different from global (or just explicit ones? user said "different")
      const ids = Object.entries(participant.prize_weights)
        .filter(([, w]) => w !== participant.weight)
        .map(([id]) => Number(id));
      setActivePrizeIds(ids);
    } else {
      setActivePrizeIds([]);
    }
  }, [participant]);

  // Filter available prizes for search
  const availablePrizes = useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return prizes.filter(
      (p) =>
        !activePrizeIds.includes(p.id!) &&
        p.name.toLowerCase().includes(lowerTerm),
    );
  }, [prizes, activePrizeIds, searchTerm]);

  const handleAddPrize = (prizeId: number) => {
    setActivePrizeIds((prev) => [...prev, prizeId]);
    setSearchTerm("");
  };

  const handleDeletePrize = (prizeId: number) => {
    setActivePrizeIds((prev) => prev.filter((id) => id !== prizeId));
  };

  const activePrizesList = useMemo(() => {
    return prizes.filter((p) => activePrizeIds.includes(p.id!));
  }, [prizes, activePrizeIds]);

  return (
    <div className="space-y-4">
      <GlobalWeightRow
        participant={participant}
        lotteryId={lotteryId}
        token={token}
        onUpdate={onUpdate}
      />

      {activePrizesList.length > 0 && <hr />}

      <div className="space-y-2">
        {activePrizesList.map((prize) => (
          <PrizeWeightRow
            key={prize.id}
            prize={prize}
            participant={participant}
            lotteryId={lotteryId}
            token={token}
            onUpdate={onUpdate}
            onDelete={() => handleDeletePrize(prize.id!)}
          />
        ))}
      </div>

      <hr />

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground block">
          添加单独权重
        </label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索奖品..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
            {availablePrizes.length === 0 ? (
              <div className="p-3 text-sm text-center text-muted-foreground">
                无匹配奖品
              </div>
            ) : (
              availablePrizes.map((p) => (
                <button
                  key={p.id}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleAddPrize(p.id!)}
                >
                  <span className="truncate flex-1">{p.name}</span>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// User display: ID (username or name)
function UserDisplay({
  participant,
  mobile = false,
}: {
  participant: Participant;
  mobile?: boolean;
}) {
  const displayName = participant.username
    ? `@${participant.username}`
    : participant.first_name
      ? `${participant.first_name} ${participant.last_name || ""}`.trim()
      : participant.user_id.toString();

  return (
    <span className={mobile ? "text-sm" : ""}>
      <span className="text-muted-foreground">{participant.user_id}</span>
      <span className="text-muted-foreground"> (</span>
      {displayName}
      <span className="text-muted-foreground">)</span>
    </span>
  );
}

function PrizeWeightRow({
  prize,
  participant,
  lotteryId,
  token,
  onUpdate,
  onDelete,
}: {
  prize: Prize;
  participant: Participant | null;
  lotteryId: string;
  token: string;
  onUpdate: () => Promise<void>;
  onDelete: () => void;
}) {
  if (!participant) return null;

  const specificWeight = participant.prize_weights?.[prize.id!];
  const isSet = specificWeight !== undefined;

  const [weight, setWeight] = useState(
    isSet ? specificWeight.toString() : participant.weight.toString(),
  );

  const handleSave = async () => {
    const w = parseInt(weight);
    if (isNaN(w) || w < 0) {
      toast.error("权重必须大于等于 0");
      return;
    }

    try {
      await updatePrizeWeight(
        lotteryId,
        participant.user_id,
        prize.id!,
        w,
        token,
      );
      toast.success("奖品权重已更新");
      onUpdate();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleRevert = async () => {
    try {
      await deletePrizeWeight(lotteryId, participant.user_id, prize.id!, token);
      toast.success("已恢复全局权重");

      // Update local UI immediately
      onDelete();

      // Update global data
      onUpdate();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-2 border rounded-lg">
      <div className="flex-1 min-w-0 pl-1">
        <div className="truncate">{prize.name}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleRevert}
          title="恢复全局权重"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min={0}
          className="w-20 h-8 text-center"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={handleSave}
          autoFocus={false}
        />
      </div>
    </div>
  );
}

// Inline weight edit - click to become input

function GlobalWeightRow({
  participant,
  lotteryId,
  token,
  onUpdate,
}: {
  participant: Participant | null;
  lotteryId: string;
  token: string;
  onUpdate: () => Promise<void>;
}) {
  if (!participant) return null;

  const [weight, setWeight] = useState(participant.weight.toString());

  // Update local state when participant changes
  useEffect(() => {
    setWeight(participant.weight.toString());
  }, [participant.weight]);

  const handleSave = async () => {
    const w = parseInt(weight);
    if (isNaN(w) || w < 0 || w > 100) {
      toast.error("权重必须在 0-100 之间");
      setWeight(participant.weight.toString()); // Revert
      return;
    }

    if (w === participant.weight) return;

    try {
      await updateParticipantWeight(lotteryId, participant.user_id, w, token);
      toast.success("全局权重已更新");
      onUpdate();
    } catch (e) {
      toast.error(getErrorMessage(e));
      setWeight(participant.weight.toString()); // Revert
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-2 border rounded-lg bg-muted/20">
      <div className="flex-1 min-w-0 pl-1">
        <div className="truncate text-sm">全局权重</div>
        <div className="text-xs text-muted-foreground">
          适用于未单独设置权重的奖品
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          className="w-20 h-8 text-center"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={handleSave}
          autoFocus={false}
        />
      </div>
    </div>
  );
}

function AddParticipantDialog({
  lotteryId,
  token,
  onSuccess,
  open,
  onOpenChange,
}: {
  lotteryId: string;
  token: string;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("请输入用户 ID");
      return;
    }

    setLoading(true);
    try {
      await addParticipant(lotteryId, token, {
        user_id: parseInt(userId),
      });
      toast.success("已添加参与者");
      onSuccess();
      onOpenChange(false);
      setUserId("");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>添加参与者</DialogTitle>
          <DialogDescription>手动添加用户到抽奖列表</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="user_id" className="text-left text-sm font-medium">
              User ID
            </label>
            <Input
              id="user_id"
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="col-span-3"
              required
              placeholder="12345678"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "添加中..." : "确认添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
