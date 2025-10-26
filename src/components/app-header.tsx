import { UserButton } from "@clerk/tanstack-react-start";
import { Button } from "~/components/atoms";
import { useAuth } from "~/components/hooks/auth";

export function AppHeader(props: { children?: React.ReactNode }) {
  const auth = useAuth();

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">{props.children}</div>
      <div className="flex items-center gap-2">
        <Button onClick={auth.lock}>Lock</Button>
        <UserButton
          appearance={{
            elements: {
              userButtonPopoverActionButton__signOut: { display: "none" },
            },
          }}
        />
        <Button onClick={auth.signOut}>Sign out</Button>
      </div>
    </div>
  );
}
