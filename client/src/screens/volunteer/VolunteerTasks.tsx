import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type DeliverTaskResponse } from "@/lib/api";
import type { Donation, Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserSync } from "@/lib/authClient";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";

type DeliverForm = {
  name: string;
  age: string;
  address: string;
  email: string;
  phone: string;
};

const emptyDeliverForm: DeliverForm = {
  name: "",
  age: "",
  address: "",
  email: "",
  phone: "",
};

export default function VolunteerTasks() {
  const nav = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [donationsById, setDonationsById] = useState<Record<string, Donation>>(
    {},
  );
  const [deliverTaskId, setDeliverTaskId] = useState<string | null>(null);
  const [deliverForm, setDeliverForm] = useState<DeliverForm>(emptyDeliverForm);
  const [deliverSubmitting, setDeliverSubmitting] = useState(false);
  const [deliverError, setDeliverError] = useState<string | null>(null);
  const [lastFeedbackUrl, setLastFeedbackUrl] = useState<string | null>(null);
  const [lastDeliveryNotice, setLastDeliveryNotice] = useState<string | null>(
    null,
  );
  async function load() {
    const user = getCurrentUserSync();
    if (!user || user.role !== "VOLUNTEER") return;
    const t = (await api.listTasks(user.id)) as Task[];
    setTasks(t);

    // load donation details for visible tasks
    const map: Record<string, Donation> = {};
    for (const task of t.slice(0, 10)) {
      const d = (await api.getDonation(task.donationId)) as Donation | null;
      if (d) map[d.id] = d;
    }
    setDonationsById(map);
  }

  useEffect(() => {
    load();
  }, []);

  const active = useMemo(
    () => tasks.filter((t) => t.step !== "DELIVERED"),
    [tasks],
  );
  const done = useMemo(
    () => tasks.filter((t) => t.step === "DELIVERED"),
    [tasks],
  );

  return (
    <div className="space-y-4">
      <GradientHeader
        title="My Tasks"
        subtitle="Advance steps: Ready → Started → Picked up → Delivered"
      />

      <div className="space-y-3">
        {(active.length ? active : done).map((t) => {
          const d = donationsById[t.donationId];
          const title = d
            ? `${d.category} • ${d.pickupLocation.label}`
            : t.donationId;

          return (
            <Card key={t.id} className="bg-card/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-xs text-muted-foreground">
                      Task {t.id} • Updated{" "}
                      {new Date(t.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="secondary">{t.step}</Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => nav(`/volunteer/tasks/${t.id}/checklist`)}
                  >
                    Checklist
                  </Button>
                  {t.step === "PICKED_UP" ? (
                    <Button
                      className="rounded-xl flex-1"
                      onClick={() => {
                        setDeliverTaskId(t.id);
                        setDeliverForm(emptyDeliverForm);
                        setDeliverError(null);
                        setLastDeliveryNotice(null);
                      }}
                    >
                      Mark as Delivered
                    </Button>
                  ) : t.step !== "DELIVERED" ? (
                    <Button
                      className="rounded-xl flex-1"
                      onClick={async () => {
                        try {
                          await api.advanceTask(t.id);
                          load();
                        } catch {
                          /* advance failed */
                        }
                      }}
                    >
                      Advance step
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No tasks yet. Accept a pickup!
          </div>
        ) : null}

        {lastFeedbackUrl && (
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-800">
                Delivery recorded. Share this feedback link with the recipient
                (e.g. via WhatsApp) if they didn’t get an email:
              </p>
              <div className="flex gap-2 items-center">
                <Input
                  readOnly
                  value={lastFeedbackUrl}
                  className="font-mono text-xs bg-white"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(lastFeedbackUrl);
                    setLastFeedbackUrl(null);
                  }}
                >
                  Copy & dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {lastDeliveryNotice && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800">{lastDeliveryNotice}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Deliver modal: end-user details */}
      {deliverTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deliverSubmitting && setDeliverTaskId(null)}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-lg">
                Record delivery – end user details
              </h3>
              <p className="text-sm text-muted-foreground">
                Add recipient details. They will receive an email/SMS with a
                feedback link (provide at least email or phone).
              </p>
              {deliverError && (
                <p className="text-sm text-destructive">{deliverError}</p>
              )}
              <div className="grid gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Name *
                  </label>
                  <Input
                    value={deliverForm.name}
                    onChange={(e) =>
                      setDeliverForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Recipient name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Age (optional)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={150}
                    value={deliverForm.age}
                    onChange={(e) =>
                      setDeliverForm((f) => ({ ...f, age: e.target.value }))
                    }
                    placeholder="Age"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Address *
                  </label>
                  <Input
                    value={deliverForm.address}
                    onChange={(e) =>
                      setDeliverForm((f) => ({ ...f, address: e.target.value }))
                    }
                    placeholder="Delivery address"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Email (for feedback link)
                  </label>
                  <Input
                    type="email"
                    value={deliverForm.email}
                    onChange={(e) =>
                      setDeliverForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="email@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Phone (for feedback link)
                  </label>
                  <Input
                    type="tel"
                    value={deliverForm.phone}
                    onChange={(e) =>
                      setDeliverForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="Phone number"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="secondary"
                  onClick={() => !deliverSubmitting && setDeliverTaskId(null)}
                  disabled={deliverSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    deliverSubmitting ||
                    !deliverForm.name.trim() ||
                    !deliverForm.address.trim() ||
                    (!deliverForm.email.trim() && !deliverForm.phone.trim())
                  }
                  onClick={async () => {
                    if (!deliverTaskId) return;
                    setDeliverSubmitting(true);
                    setDeliverError(null);
                    try {
                      const res: DeliverTaskResponse = await api.deliverTask(
                        deliverTaskId,
                        {
                          name: deliverForm.name.trim(),
                          age: deliverForm.age
                            ? parseInt(deliverForm.age, 10)
                            : undefined,
                          address: deliverForm.address.trim(),
                          email: deliverForm.email.trim() || undefined,
                          phone: deliverForm.phone.trim() || undefined,
                        },
                      );
                      setDeliverTaskId(null);
                      setDeliverForm(emptyDeliverForm);
                      if (res?.feedbackUrl) setLastFeedbackUrl(res.feedbackUrl);
                      if (res.emailAttempted && res.emailSent === false) {
                        setLastDeliveryNotice(
                          res.emailError
                            ? `Delivery saved, but email failed: ${res.emailError}`
                            : "Delivery saved, but feedback email could not be sent.",
                        );
                      } else {
                        setLastDeliveryNotice(null);
                      }
                      load();
                    } catch (e: unknown) {
                      setDeliverError(
                        e instanceof Error
                          ? e.message
                          : "Failed to submit. Try again.",
                      );
                    } finally {
                      setDeliverSubmitting(false);
                    }
                  }}
                >
                  {deliverSubmitting
                    ? "Submitting…"
                    : "Submit & mark delivered"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
