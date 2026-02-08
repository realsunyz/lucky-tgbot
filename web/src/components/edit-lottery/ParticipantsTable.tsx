import { useState, useEffect, useRef } from "react";
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
import { Trash2 } from "lucide-react";
import type { Participant } from "@/api/lottery";
import { updateParticipantWeight } from "@/api/lottery";

interface ParticipantsTableProps {
  participants: Participant[];
  lotteryId: string;
  token: string;
  onDelete: (participant: Participant) => Promise<void>;
  onDataUpdate: () => Promise<void>;
}

export function ParticipantsTable({
  participants,
  lotteryId,
  token,
  onDelete,
  onDataUpdate,
}: ParticipantsTableProps) {
  const [deletingParticipant, setDeletingParticipant] =
    useState<Participant | null>(null);

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
          <CardDescription>查看所有参与用户并修改全局默认权重</CardDescription>
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
                      <TableHead className="w-[140px] text-center whitespace-nowrap">
                        全局权重
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
                        <TableCell className="text-center">
                          <InlineWeightEdit
                            participant={p}
                            lotteryId={lotteryId}
                            token={token}
                            onUpdate={onDataUpdate}
                          />
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingParticipant(p)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
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
                      <InlineWeightEdit
                        participant={p}
                        lotteryId={lotteryId}
                        token={token}
                        onUpdate={onDataUpdate}
                      />
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

// Inline weight edit - click to become input
function InlineWeightEdit({
  participant,
  lotteryId,
  token,
  onUpdate,
}: {
  participant: Participant;
  lotteryId: string;
  token: string;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [weight, setWeight] = useState(participant.weight.toString());
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeight(participant.weight.toString());
  }, [participant.weight]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const w = parseInt(weight);
    if (isNaN(w) || w < 0 || w > 100) {
      toast.error("权重必须在 0-100 之间");
      setWeight(participant.weight.toString());
      setIsEditing(false);
      return;
    }

    if (w === participant.weight) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      await updateParticipantWeight(lotteryId, participant.user_id, w, token);
      toast.success("权重已更新");
      onUpdate();
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失败");
      setWeight(participant.weight.toString());
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setWeight(participant.weight.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        min={0}
        max={100}
        className="h-7 w-20 text-center text-base font-mono"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="h-7 px-2 min-w-16 text-sm font-mono rounded-md border border-border bg-transparent hover:bg-accent transition-colors cursor-text"
    >
      ×{participant.weight}
    </button>
  );
}
