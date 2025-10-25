import { UserButton, useClerk } from "@clerk/tanstack-react-start";
import { Button } from "~/components/atoms";
import { useE2EE } from "~/components/hooks/e2ee";

export function AppHeader(props: { children?: React.ReactNode }) {
  const { lock } = useE2EE();
  const clerk = useClerk();

  const handleSignOut = async () => {
    lock();
    await clerk.signOut();
  };

  const handleLock = () => {
    lock();
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">{props.children}</div>
      <div className="flex items-center gap-2">
        <Button onClick={handleLock}>Lock X</Button>
        <UserButton />
        <Button onClick={handleSignOut}>Sign out</Button>
      </div>
    </div>
  );
}
