import { Link } from "@tanstack/react-router";
import { useAuth } from "./hooks/auth";
import { Button } from "./atoms";
import { UserButton } from "@clerk/tanstack-react-start";
import { useE2ee } from "./hooks/e2ee";

export function Toolbar() {
  const auth = useAuth();
  const { isDekUnlocked } = useE2ee();

  return (
    <div className="flex items-center justify-end gap-2 bg-white p-1 text-sm shadow">
      <Link to="/contacts">Contacts</Link>
      <Link to="/profile">Profile</Link>
      <Button onClick={auth.lock} disabled={!isDekUnlocked}>
        Lock
      </Button>
      <Button onClick={auth.signOut}>Sign out</Button>
      <UserButton
        appearance={{
          elements: {
            userButtonPopoverActionButton__signOut: { display: "none" },
          },
        }}
      />
    </div>
  );
}
