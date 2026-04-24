import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { Star } from "lucide-react";

export default function FeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<{
    donorName: string;
    volunteerName: string;
    alreadySubmitted: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid feedback link");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.feedback.getByToken(token);
        setInfo(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid or expired link");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!token || rating < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.feedback.submit(token, { rating, comment: comment.trim() || undefined });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              This link may have expired or already been used.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (info?.alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-2">
            <h1 className="text-xl font-semibold text-emerald-700">Thank you!</h1>
            <p className="text-muted-foreground">
              Your feedback has been recorded. We appreciate you taking the time to help us improve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Share your feedback</h1>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>{info?.volunteerName}</strong> delivered food from <strong>{info?.donorName}</strong>.
              How was the experience?
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Food quality & service (1–5 stars) *</label>
            <div className="flex gap-1 mt-2" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  onMouseEnter={() => setHoverRating(value)}
                  onClick={() => setRating(value)}
                >
                  <Star
                    className="w-8 h-8 transition-colors"
                    fill={
                      (hoverRating || rating) >= value
                        ? "hsl(var(--primary))"
                        : "none"
                    }
                    stroke={
                      (hoverRating || rating) >= value
                        ? "hsl(var(--primary))"
                        : "currentColor"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Additional comments (optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any issues with food quality, packaging, or suggestions?"
              className="mt-2 min-h-[80px]"
              maxLength={2000}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            disabled={rating < 1 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting…" : "Submit feedback"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
