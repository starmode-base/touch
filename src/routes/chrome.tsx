import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { upsertContact } from "~/server-functions/chrome";
import { linkedinPatternExact } from "~/lib/linkedin-extractor";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { SecureToken } from "~/lib/secure-token";

export const Route = createFileRoute("/chrome")({
  validateSearch: z.object({
    workspaceId: SecureToken,
    name: z.string(),
    linkedin: z.string().regex(linkedinPatternExact),
  }),
  component: Page,
  ssr: false,
});

function Page() {
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "validating" }
    | { kind: "posting" }
    | { kind: "done"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const params = Route.useSearch();
  console.log("params", params);

  const upsertContactByLinkedIn = useServerFn(upsertContact);

  const workspaceId = params.workspaceId.trim();
  const name = params.name.trim().slice(0, 64);
  const linkedin = params.linkedin.trim();

  console.log("workspaceId", workspaceId);
  console.log("name", name);
  console.log("linkedin", linkedin);

  useEffect(() => {
    const run = async () => {
      setStatus({ kind: "validating" });

      try {
        setStatus({ kind: "posting" });

        const result = await upsertContactByLinkedIn({
          data: {
            workspaceId,
            name,
            linkedin,
          },
        });

        const msg =
          result.mode === "created"
            ? "Contact created"
            : result.mode === "updated"
              ? "Contact updated"
              : "Contact up to date";

        setStatus({ kind: "done", message: msg });
      } catch (err) {
        setStatus({
          kind: "error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          message: (err && (err as any).message) ?? "Failed",
        });
      }
    };

    void run();
  }, [linkedin, name, upsertContactByLinkedIn, workspaceId]);

  return (
    <div className="m-auto flex max-w-sm flex-col gap-3 rounded border border-slate-200 bg-white p-4 text-sm">
      <div className="font-medium">Chrome extension bridge</div>
      {status.kind === "validating" && <div>Validating…</div>}
      {status.kind === "posting" && <div>Saving…</div>}
      {status.kind === "done" && <div>{status.message}</div>}
      {status.kind === "error" && (
        <div className="text-red-600">{status.message}</div>
      )}
    </div>
  );
}
