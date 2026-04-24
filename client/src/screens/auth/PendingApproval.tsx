import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { Clock } from "lucide-react";

export default function PendingApproval() {
  const location = useLocation();
  const nav = useNavigate();
  const message =
    (location.state as { message?: string })?.message ??
    "Your account is pending approval. You will be notified by email when an admin approves it. Then you can sign in with your credentials.";

  return (
    <div className="min-h-dvh flex flex-col px-4">
      <GradientHeader
        title="Pending approval"
        subtitle="Your account has been submitted for review"
      />
      <div className="flex-1 flex items-center">
        <Card className="w-full bg-card/60">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-amber-500/20 p-4">
                <Clock className="h-10 w-10 text-amber-600" />
              </div>
            </div>
            <p className="text-center text-muted-foreground">{message}</p>
            <Button
              className="w-full rounded-xl"
              onClick={() => nav("/auth/login")}
            >
              Go to Login
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => nav("/auth")}
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
