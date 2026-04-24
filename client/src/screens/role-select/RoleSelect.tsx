import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandHeart, PackageOpen, ArrowRight, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { setRole } from "@/lib/sessions";

export default function RoleSelect() {
  const nav = useNavigate();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5">
        <div className="text-2xl font-semibold tracking-tight">
          Leftover Link
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Donate surplus food • Volunteers pick up & deliver • Demo with dummy
          data
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              api.resetDemo();
              location.reload();
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset demo data
          </Button>
        </div>
      </div>

      <Card className="border bg-card/70">
        <CardHeader>
          <CardTitle className="text-base">Choose your role</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button
            className="h-14 justify-between rounded-xl"
            onClick={() => {
              setRole("donor");
              nav("/donor/home");
            }}
          >
            <span className="flex items-center gap-2">
              <PackageOpen className="h-5 w-5" />
              I’m a Donor
            </span>
            <ArrowRight className="h-5 w-5 opacity-80" />
          </Button>

          <Button
            variant="secondary"
            className="h-14 justify-between rounded-xl"
            onClick={() => {
              setRole("volunteer");
              nav("/volunteer/home");
            }}
          >
            <span className="flex items-center gap-2">
              <HandHeart className="h-5 w-5" />
              I’m a Volunteer
            </span>
            <ArrowRight className="h-5 w-5 opacity-80" />
          </Button>

          <div className="text-xs text-muted-foreground">
            You can switch roles anytime in{" "}
            <span className="font-medium">Settings</span>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
