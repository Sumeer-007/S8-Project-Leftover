import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types";
import { api } from "@/lib/api";
// import { useToast } from "@/components/ui/use-toast";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";

export default function TaskChecklist() {
  const { taskId } = useParams();
  const nav = useNavigate();
  //   const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);

  async function load() {
    if (!taskId) return;
    setTask((await api.getTask(taskId)) as Task | null);
  }

  useEffect(() => {
    load();
  }, [taskId]);

  if (!task)
    return <div className="text-sm text-muted-foreground">Loading…</div>;

  const c = task.checklist;

  return (
    <div className="space-y-4">
      <GradientHeader
        title="Pickup Checklist"
        subtitle={`Task ${task.id} • Step: ${task.step}`}
      />

      <Card className="bg-card/60">
        <CardContent className="p-4 space-y-4">
          <Row
            label="Food is sealed"
            checked={c.sealed}
            onCheckedChange={async (v) =>
              setTask((await api.saveChecklist(task.id, { sealed: !!v })) as Task)
            }
          />
          <Row
            label="Labelled / identified"
            checked={c.labelled}
            onCheckedChange={async (v) =>
              setTask((await api.saveChecklist(task.id, { labelled: !!v })) as Task)
            }
          />
          <Row
            label="No leakage / safe packaging"
            checked={c.noLeak}
            onCheckedChange={async (v) =>
              setTask((await api.saveChecklist(task.id, { noLeak: !!v })) as Task)
            }
          />
          <Row
            label="Collected on time"
            checked={c.onTime}
            onCheckedChange={async (v) =>
              setTask((await api.saveChecklist(task.id, { onTime: !!v })) as Task)
            }
          />

          <div className="space-y-2">
            <div className="text-sm font-medium">Note (optional)</div>
            <Textarea
              className="rounded-xl"
              value={c.note ?? ""}
              onChange={(e: any) =>
                setTask({
                  ...task,
                  checklist: { ...task.checklist, note: e.target.value },
                })
              }
              placeholder="Any issues? e.g., missing item, delayed pickup..."
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={() => nav(-1)}
            >
              Back
            </Button>
            <Button
              className="rounded-xl flex-1"
              onClick={async () => {
                await api.saveChecklist(task.id, {
                  note: task.checklist.note ?? "",
                });
                // toast({
                //   title: "Saved",
                //   description: "Checklist saved (demo).",
                // });
                nav(-1);
              }}
            >
              Save checklist
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/20 p-3">
      <div className="text-sm">{label}</div>
      <Checkbox
        checked={checked}
        onCheckedChange={(v: boolean) => onCheckedChange(!!v)}
      />
    </div>
  );
}
