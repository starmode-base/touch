import { createFileRoute } from "@tanstack/react-router";
import { contactActivitiesCollection } from "#collections/contact-activities";
import { eq, useLiveQuery } from "@tanstack/react-db";

export const Route = createFileRoute("/_auth/contacts/$contact")({
  component: RouteComponent,
  loader: async ({ context }) => {
    // Wait for the activities this route renders so navigations don't show
    // an empty flash. Client only: during SSR collection sync is disabled and
    // preload would never resolve. Signed-in only: the queryFn server
    // function rejects for signed-out visitors (who get the sign-in screen).
    if (typeof window !== "undefined" && context.viewer) {
      await contactActivitiesCollection.preload();
    }
  },
});

function RouteComponent() {
  const params = Route.useParams();

  const contactActivities = useLiveQuery(
    (q) => {
      return (
        q
          .from({ contactActivity: contactActivitiesCollection })
          .where(({ contactActivity }) =>
            eq(contactActivity.contact_id, params.contact),
          )
          // happened_at is only a date field (no time part), so not very granular
          .orderBy(({ contactActivity }) => contactActivity.happened_at, "desc")
          // created_at is a timestamp field, so we sort by it second
          .orderBy(({ contactActivity }) => contactActivity.created_at, "desc")
          // id serves as a tie-breaker
          .orderBy(({ contactActivity }) => contactActivity.id, "desc")
      );
    },
    [params.contact],
  );

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
      <div className="heading-1 py-2">Contact Activities</div>
      <div className="flex flex-col gap-1 text-sm">
        {!contactActivities.isReady && (
          <div className="text-slate-500">Loading…</div>
        )}
        {contactActivities.data.map((contactActivity) => (
          <div
            key={contactActivity.id}
            className="flex flex-col gap-1 rounded border border-slate-200 bg-white p-2"
          >
            <div>{contactActivity.kind}</div>
            <div>{contactActivity.happened_at}</div>
            <div>{contactActivity.details?.name}</div>
            <div>{contactActivity.details?.linkedin}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
