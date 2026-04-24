import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
};

type NotificationDisplayProps = {
  notifications: InAppNotification[];
  onDismiss: (id: string) => void;
};

export function NotificationDisplay({
  notifications,
  onDismiss,
}: NotificationDisplayProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto w-full max-w-md px-4">
      <div className="ml-auto flex w-full max-w-sm flex-col gap-2">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className="pointer-events-auto border-border/80 bg-background/95 shadow-lg backdrop-blur-sm"
        >
          <CardContent className="flex items-start justify-between gap-3 p-3.5">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
                  New
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {notification.receivedAt}
                </span>
              </div>
              <p className="line-clamp-1 text-sm font-semibold tracking-tight">
                {notification.title}
              </p>
              <p className="mt-1.5 line-clamp-3 text-sm leading-5 text-muted-foreground">
                {notification.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(notification.id)}
              className="rounded-md px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss notification"
            >
              Dismiss
            </button>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}
