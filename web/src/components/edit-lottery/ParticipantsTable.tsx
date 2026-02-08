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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer } from "vaul";
import { Trash2, Settings2 } from "lucide-react";
import type { Participant, Prize } from "@/api/lottery";
import { updateParticipantWeight, updatePrizeWeight } from "@/api/lottery";

interface ParticipantsTableProps {
  participants: Participant[];
  prizes: Prize[];
  lotteryId: string;
  token: string;
  onDelete: (participant: Participant) => Promise<void>;
  onDataUpdate: () => Promise<void>;
}

export function ParticipantsTable({
  participants,
  prizes,
  lotteryId,
  token,
  onDelete,
  onDataUpdate,
}: ParticipantsTableProps) {
  const [deletingParticipant, setDeletingParticipant] =
    useState<Participant | null>(null);
  const [weightEditingParticipant, setWeightEditingParticipant] =
    useState<Participant | null>(null);

  // Check if mobile
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  }, []);

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
        <CardHeader>
          <CardTitle>参与者列表</CardTitle>
          <CardDescription>
            查看所有参与用户并修改权重。点击用户 ID 可设置特定奖品的权重。
          </CardDescription>
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
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setWeightEditingParticipant(p)}
                            >
                              <Settings2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingParticipant(p)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => setWeightEditingParticipant(p)}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingParticipant(p)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingParticipant}
        onOpenChange={(open) => !open && setDeletingParticipant(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除参与者？</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要移除{" "}
              <span className="font-medium text-foreground">
                {deletingParticipant?.username ||
                  deletingParticipant?.first_name}
              </span>{" "}
              吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingParticipant(null)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prize Weight Edit Dialog/Drawer */}
      {!isMobile ? (
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
                    weightEditingParticipant?.first_name}
                </span>{" "}
                设置特定奖品的权重。默认权重为全局权重。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <GlobalWeightRow
                participant={weightEditingParticipant}
                lotteryId={lotteryId}
                token={token}
                onUpdate={onDataUpdate}
              />
              <hr />
              {prizes.length === 0 ? (
                <p className="text-center text-muted-foreground">暂无奖品</p>
              ) : (
                prizes.map((prize) => (
                  <PrizeWeightRow
                    key={prize.id}
                    prize={prize}
                    participant={weightEditingParticipant}
                    lotteryId={lotteryId}
                    token={token}
                    onUpdate={onDataUpdate}
                  />
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer.Root
          open={!!weightEditingParticipant}
          onOpenChange={(open) => !open && setWeightEditingParticipant(null)}
          repositionInputs={false}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
            <Drawer.Content className="bg-background flex flex-col rounded-t-2xl max-h-[90vh] fixed bottom-0 left-0 right-0 z-50 outline-none">
              <div className="p-4 bg-background rounded-t-2xl flex-1 overflow-y-auto">
                <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mb-4" />
                <Drawer.Title className="text-lg font-semibold mb-1">
                  设置奖品权重
                </Drawer.Title>
                <Drawer.Description className="text-sm text-muted-foreground mb-6">
                  为用户{" "}
                  <span className="font-medium text-foreground">
                    {weightEditingParticipant?.username ||
                      weightEditingParticipant?.first_name}
                  </span>{" "}
                  设置特定奖品的权重。默认权重为全局权重。
                </Drawer.Description>
                <div className="space-y-4 pb-8">
                  <GlobalWeightRow
                    participant={weightEditingParticipant}
                    lotteryId={lotteryId}
                    token={token}
                    onUpdate={onDataUpdate}
                  />
                  <hr />
                  {prizes.length === 0 ? (
                    <p className="text-center text-muted-foreground">
                      暂无奖品
                    </p>
                  ) : (
                    prizes.map((prize) => (
                      <PrizeWeightRow
                        key={prize.id}
                        prize={prize}
                        participant={weightEditingParticipant}
                        lotteryId={lotteryId}
                        token={token}
                        onUpdate={onDataUpdate}
                      />
                    ))
                  )}
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </>
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
    : `${participant.first_name} ${participant.last_name || ""}`.trim();

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
}: {
  prize: Prize;
  participant: Participant | null;
  lotteryId: string;
  token: string;
  onUpdate: () => Promise<void>;
}) {
  if (!participant) return null;

  // Use prize_weights from participant if available, otherwise default to -1 (unset/global) or specific logic?
  // Actually, we should probably fetch the specific weight or use what's in participant struct.
  // The participant struct has `prize_weights?: Record<number, number>;`
  // We need to make sure backend returns this. verified in models.go it has `json:"prize_weights,omitempty"`

  // Let's assume if it's not in the map, it uses global.
  // But for editing, we want to know if it's explicitly set.
  // If we just want to EDIT the specific weight:

  const specificWeight = participant.prize_weights?.[prize.id!];
  const isSet = specificWeight !== undefined;

  const [weight, setWeight] = useState(
    isSet ? specificWeight.toString() : participant.weight.toString(),
  );

  // If not set, we show global weight but maybe visually distinct?
  // Let's just allow editing.

  const handleSave = async () => {
    const w = parseInt(weight);
    if (isNaN(w) || w < 0) {
      toast.error("权重必须大于等于 0");
      return;
    }

    // If user clears the input or sets to same as global?
    // API `updatePrizeWeight` sets a specific weight.
    // Currently no API to "unset" a prize weight specifically (revert to global),
    // unless we treat -1 or something as unset?
    // For now, let's just allow setting a specific weight.

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
      toast.error("更新失败");
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-2 border rounded-lg">
      <div className="flex-1 min-w-0 pl-1">
        <div className="truncate">{prize.name}</div>
      </div>
      <div className="flex items-center gap-2">
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
      toast.error("更新失败");
      setWeight(participant.weight.toString()); // Revert
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-2 border rounded-lg bg-muted/20">
      <div className="flex-1 min-w-0 pl-1">
        <div className="truncate font-medium">全局权重</div>
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
