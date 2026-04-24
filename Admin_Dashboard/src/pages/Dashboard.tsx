import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminApi,
  mainApi,
  type PendingUser,
  type DonationWithFeedback,
  type VerificationAiReport,
} from "@/lib/api";

function step1BadgeStyle(overall: string | undefined): CSSProperties {
  const o = (overall || "").toLowerCase();
  if (o === "pass") return { background: "#dcfce7", color: "#166534" };
  if (o === "fail") return { background: "#fee2e2", color: "#991b1b" };
  return { background: "#fef9c3", color: "#854d0e" };
}

function aiDocLine(label: string, status: string | undefined) {
  const s = (status || "—").toUpperCase();
  const color =
    s === "PASS" ? "#166534" : s === "FAIL" ? "#991b1b" : "#a16207";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, color }}>{s}</span>
    </div>
  );
}

function AiPrecheckPanel({
  report,
  role,
}: {
  report: VerificationAiReport;
  role: string;
}) {
  const overall = report.step1Overall;
  const d = report.donor as Record<string, { status?: string }> | null | undefined;
  const v = report.volunteer as
    | Record<string, { status?: string }>
    | null
    | undefined;
  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        background: "linear-gradient(135deg, #f0f9ff 0%, #ecfeff 100%)",
        border: "1px solid #bae6fd",
        fontSize: 12,
        color: "#0c4a6e",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 6,
        }}
      >
        <strong>Step 1 — AI pre-check</strong>
        <span
          style={{
            fontSize: 11,
            padding: "2px 10px",
            borderRadius: 999,
            fontWeight: 700,
            textTransform: "uppercase",
            ...step1BadgeStyle(overall),
          }}
        >
          {overall || "—"}
        </span>
        <span style={{ fontSize: 11, opacity: 0.85 }}>
          OCR: {report.ocrEngine || "—"}
        </span>
      </div>
      {report.step1Summary && (
        <p style={{ margin: "4px 0 8px", lineHeight: 1.45 }}>
          {report.step1Summary}
        </p>
      )}
      {role === "DONOR" && d && (
        <div
          style={{
            display: "grid",
            gap: 4,
            fontSize: 11,
            borderTop: "1px solid #bae6fd",
            paddingTop: 8,
          }}
        >
          {aiDocLine("Aadhaar front", d.aadhaarFront?.status)}
          {aiDocLine("Aadhaar back", d.aadhaarBack?.status)}
          {aiDocLine("Food safety / FSSAI cert", d.foodSafetyCert?.status)}
        </div>
      )}
      {role === "VOLUNTEER" && v && (
        <div
          style={{
            display: "grid",
            gap: 4,
            fontSize: 11,
            borderTop: "1px solid #bae6fd",
            paddingTop: 8,
          }}
        >
          {aiDocLine("Aadhaar number (form)", v.aadhaarNumber?.status)}
          {aiDocLine("Volunteer ID / NGO proof", v.idProof?.status)}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [donations, setDonations] = useState<DonationWithFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [donationsError, setDonationsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [verification, setVerification] = useState<
    Record<string, { aadhaar: boolean; certOrId: boolean }>
  >({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminApi.listPendingUsers();
      setPending(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const loadDonations = async () => {
    setDonationsLoading(true);
    setDonationsError(null);
    try {
      const list = await mainApi.listDonations();
      setDonations(Array.isArray(list) ? list : []);
    } catch (e) {
      setDonations([]);
      setDonationsError(
        e instanceof Error
          ? e.message
          : "Failed to load. Ensure main API (port 8000) is running and CORS allows this origin.",
      );
    } finally {
      setDonationsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadDonations();
  }, []);

  // Auto-refresh donations so new feedback appears when users submit
  useEffect(() => {
    const interval = setInterval(loadDonations, 30_000);
    return () => clearInterval(interval);
  }, []);

  const toggleVerification = (
    userId: string,
    field: "aadhaar" | "certOrId",
  ) => {
    setVerification((prev) => {
      const current = prev[userId] ?? { aadhaar: false, certOrId: false };
      return {
        ...prev,
        [userId]: { ...current, [field]: !current[field] },
      };
    });
  };

  const isUserVerified = (user: PendingUser): boolean => {
    const v = verification[user.id];
    if (!v) return false;
    return v.aadhaar && v.certOrId;
  };

  const handleApprove = async (user: PendingUser) => {
    setActioning(user.id);
    try {
      await adminApi.approveUser(user.id);
      setPending((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (user: PendingUser) => {
    setActioning(user.id);
    try {
      await adminApi.rejectUser(user.id);
      setPending((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActioning(null);
    }
  };

  const logout = () => {
    adminApi.logout();
    nav("/login", { replace: true });
  };

  const openImage = (base64: any) => {
    const byteString = atob(base64.split(",")[1]);
    const mimeString = base64.split(",")[0].split(":")[1].split(";")[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    const url = URL.createObjectURL(blob);

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        boxSizing: "border-box",
        background:
          "radial-gradient(circle at top left, #e0f2fe 0, transparent 55%), radial-gradient(circle at bottom right, #fee2e2 0, transparent 55%), #f3f4f6",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Top header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Leftover Link · Admin</h1>
            <p
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Approve trusted donors and volunteers, and track donation quality.
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: "8px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: 999,
              background: "#f9fafb",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Logout
          </button>
        </div>

        {/* Pending users area */}
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Pending approvals</h2>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                Step 1: AI pre-check (OCR + rules). Step 2: confirm below, then
                approve or reject.
              </p>
            </div>
            <span
              style={{
                fontSize: 12,
                padding: "2px 10px",
                borderRadius: 999,
                background: pending.length ? "#ecfeff" : "#f3f4f6",
                color: pending.length ? "#0891b2" : "#9ca3af",
              }}
            >
              {pending.length} pending
            </span>
          </div>

          {error && (
            <div
              style={{
                padding: 12,
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <p style={{ color: "#6b7280", fontSize: 14 }}>
              Loading pending users…
            </p>
          ) : pending.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 14 }}>
              No pending user requests. New donor and volunteer signups will
              appear here for approval.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {pending.map((user) => (
                <li
                  key={user.id}
                  style={{
                    padding: 16,
                    background: "#f9fafb",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr)",
                    rowGap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{user.fullName || user.username}</strong>
                <span style={{ marginLeft: 8, color: "#666", fontSize: 14 }}>
                  @{user.username} · {user.role}
                </span>
                {user.phone && (
                  <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
                    {user.phone}
                  </div>
                )}
                {user.email && (
                  <div style={{ fontSize: 14, color: "#666" }}>
                    {user.email}
                  </div>
                )}
                {user.organization && (
                  <div style={{ fontSize: 14, color: "#666" }}>
                    Org: {user.organization}
                  </div>
                )}
                {user.city && (
                  <div style={{ fontSize: 14, color: "#666" }}>
                    City: {user.city}
                  </div>
                )}
                {user.verificationAi && (
                  <AiPrecheckPanel report={user.verificationAi} role={user.role} />
                )}
                {user.role === "DONOR" && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
                    <strong>Verification (verify before approve):</strong>{" "}
                    Aadhaar last 4: {user.aadhaarLast4 ?? "—"}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 4,
                      }}
                    >
                      {user.idFrontImage && (
                        <button
                          type="button"
                          onClick={() => {
                            if (user.idFrontImage) openImage(user.idFrontImage);
                          }}
                          style={{
                            fontSize: 12,
                            border: "none",
                            padding: 0,
                            background: "none",
                            color: "#0f766e",
                            cursor: "pointer",
                          }}
                        >
                          Aadhaar front
                        </button>
                      )}
                      {user.idBackImage && (
                        <button
                          type="button"
                          onClick={() => {
                            if (user.idBackImage) openImage(user.idBackImage);
                          }}
                          style={{
                            fontSize: 12,
                            border: "none",
                            padding: 0,
                            background: "none",
                            color: "#0f766e",
                            cursor: "pointer",
                          }}
                        >
                          Aadhaar back
                        </button>
                      )}
                      {user.foodSafetyCertImage && (
                        <button
                          type="button"
                          onClick={() => {
                            if (user.foodSafetyCertImage)
                              openImage(user.foodSafetyCertImage);
                          }}
                          style={{
                            fontSize: 12,
                            border: "none",
                            padding: 0,
                            background: "none",
                            color: "#0f766e",
                            cursor: "pointer",
                          }}
                        >
                          Food safety cert
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {user.idFrontImage?.startsWith("data:") && (
                        <img
                          src={user.idFrontImage}
                          alt="Aadhaar front"
                          style={{
                            maxWidth: 80,
                            maxHeight: 60,
                            objectFit: "contain",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                          }}
                        />
                      )}
                      {user.idBackImage?.startsWith("data:") && (
                        <img
                          src={user.idBackImage}
                          alt="Aadhaar back"
                          style={{
                            maxWidth: 80,
                            maxHeight: 60,
                            objectFit: "contain",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                          }}
                        />
                      )}
                      {user.foodSafetyCertImage?.startsWith("data:") && (
                        <img
                          src={user.foodSafetyCertImage}
                          alt="Food safety cert"
                          style={{
                            maxWidth: 80,
                            maxHeight: 60,
                            objectFit: "contain",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
                {user.role === "VOLUNTEER" && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
                    <strong>Verification (verify before approve):</strong>{" "}
                    Aadhaar last 4: {user.aadhaarLast4 ?? "—"} · ID type:{" "}
                    {user.volunteerIdType ?? "—"}
                    <div style={{ marginTop: 4 }}>
                      {user.volunteerIdProofImage && (
                        <>
                          {user.volunteerIdProofImage.startsWith("data:") && (
                            <img
                              src={user.volunteerIdProofImage}
                              alt="Volunteer ID proof"
                              style={{
                                maxWidth: 120,
                                maxHeight: 80,
                                objectFit: "contain",
                                border: "1px solid #ddd",
                                borderRadius: 4,
                              }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (user.volunteerIdProofImage) {
                                window.open(
                                  user.volunteerIdProofImage,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              }
                            }}
                            style={{
                              fontSize: 12,
                              border: "none",
                              padding: 0,
                              background: "none",
                              color: "#0f766e",
                              cursor: "pointer",
                              marginTop: 4,
                            }}
                          >
                            View ID proof
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#444",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#374151" }}>
                    Step 2 — Human verification
                  </div>
                  <div>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!verification[user.id]?.aadhaar}
                        onChange={() => toggleVerification(user.id, "aadhaar")}
                      />
                      <span>Aadhaar / ID details checked</span>
                    </label>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!verification[user.id]?.certOrId}
                        onChange={() => toggleVerification(user.id, "certOrId")}
                      />
                      <span>
                        {user.role === "DONOR"
                          ? "Food safety certificate checked"
                          : "Volunteer ID proof checked"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                      width: "100%",
                      flexWrap: "wrap",
                    }}
                  >
                    {(!verification[user.id]?.aadhaar ||
                      !verification[user.id]?.certOrId) && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#b45309",
                          alignSelf: "center",
                          marginRight: "auto",
                        }}
                      >
                        Tick both verification boxes to enable Approve.
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApprove(user)}
                      disabled={actioning === user.id || !isUserVerified(user)}
                      style={{
                        padding: "8px 16px",
                        background:
                          actioning === user.id || !isUserVerified(user)
                            ? "#e5e7eb"
                            : "#0f766e",
                        color:
                          actioning === user.id || !isUserVerified(user)
                            ? "#9ca3af"
                            : "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor:
                          actioning === user.id || !isUserVerified(user)
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {actioning === user.id
                        ? "..."
                        : "Approve (after verification)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(user)}
                      disabled={actioning === user.id}
                      style={{
                        padding: "8px 16px",
                        background: "#b91c1c",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: actioning === user.id
                          ? "not-allowed"
                          : "pointer",
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p style={{ fontSize: 11, color: "#9ca3af" }}>
          Approved users can sign in on the main app. They will be notified by
          email when approved (when configured).
        </p>

        <hr
          style={{
            margin: "8px 0 16px",
            border: "none",
            borderTop: "1px solid #f3f4f6",
          }}
        />

        {/* Donations area */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Donations & feedback</h2>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                All donations; delivery/end-user details appear once volunteers
                record them. Feedback is collected from end users.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadDonations()}
              disabled={donationsLoading}
              style={{
                padding: "8px 16px",
                border: "1px solid #0f766e",
                borderRadius: 999,
                background: "#fff",
                color: "#0f766e",
                cursor: donationsLoading ? "not-allowed" : "pointer",
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              {donationsLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {donationsError && (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: 8,
              }}
            >
              Donations: {donationsError}
            </div>
          )}
          {donationsLoading ? (
            <p style={{ color: "#6b7280", fontSize: 14 }}>
              Loading donations…
            </p>
          ) : donations.length === 0 && !donationsError ? (
            <p style={{ color: "#6b7280", fontSize: 14 }}>No donations yet.</p>
          ) : donations.length === 0 ? null : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  borderRadius: 8,
                }}
              >
                <thead>
                  <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                    <th
                      style={{
                        padding: "12px 10px",
                        fontSize: 12,
                        color: "#4b5563",
                      }}
                    >
                      Donor
                    </th>
                    <th
                      style={{
                        padding: "12px 10px",
                        fontSize: 12,
                        color: "#4b5563",
                      }}
                    >
                      Volunteer
                    </th>
                    <th
                      style={{
                        padding: "12px 10px",
                        fontSize: 12,
                        color: "#4b5563",
                      }}
                    >
                      Category
                    </th>
                    <th
                      style={{
                        padding: "12px 10px",
                        fontSize: 12,
                        color: "#4b5563",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "12px 10px",
                        fontSize: 12,
                        color: "#4b5563",
                      }}
                    >
                      End user
                    </th>
                    <th
                      style={{
                        padding: "12px 10px",
                        fontSize: 12,
                        color: "#4b5563",
                      }}
                    >
                      Feedback
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px 10px", fontSize: 14 }}>
                        {d.donorName}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 14 }}>
                        {d.assignedVolunteer?.name ?? "—"}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 14 }}>
                        {d.category}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 14 }}>
                        {d.status}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 14 }}>
                        {d.deliveryRecipient ? (
                          <span>
                            {d.deliveryRecipient.name}
                            {d.deliveryRecipient.email &&
                              ` · ${d.deliveryRecipient.email}`}
                            {d.deliveryRecipient.phone &&
                              !d.deliveryRecipient.email &&
                              ` · ${d.deliveryRecipient.phone}`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 14 }}>
                        {d.feedback ? (
                          <span>
                            {d.feedback.rating}/5
                            {d.feedback.comment &&
                              ` · "${d.feedback.comment.slice(0, 50)}${
                                d.feedback.comment.length > 50 ? "…" : ""
                              }"`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
