import { UserButton } from "@clerk/tanstack-react-start";
import { Button } from "~/components/atoms";
import { useAuth } from "~/components/hooks/auth";
import { usePasskeys } from "~/components/hooks/passkeys";

export function AppHeader(props: { children?: React.ReactNode }) {
  const { signOut } = useAuth();
  const { lock } = usePasskeys();

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">{props.children}</div>
      <div className="flex items-center gap-2">
        <Button onClick={lock}>Lock</Button>
        <UserButton />
        <Button onClick={signOut}>Sign out</Button>
      </div>
    </div>
  );
}
