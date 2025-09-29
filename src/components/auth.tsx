/**
 * https://clerk.com/docs/guides/development/custom-flows/authentication/passkeys
 * https://clerk.com/docs/reference/javascript/sign-in#authenticate-with-passkey
 * https://clerk.com/docs/reference/javascript/user#create-passkey
 * https://clerk.com/docs/guides/development/custom-flows/error-handling
 * https://clerk.com/docs/guides/development/custom-flows/overview#session-tasks
 */
import { useSignIn } from "@clerk/tanstack-react-start";
import { useRouter } from "@tanstack/react-router";
import { Button } from "./atoms";

export function SignInWithPasskeyButton(props: React.PropsWithChildren) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const signInWithPasskey = async () => {
    if (!isLoaded) return;

    const signInAttempt = await signIn.authenticateWithPasskey({
      flow: "autofill",
    });

    if (signInAttempt.status !== "complete") return;

    await setActive({
      session: signInAttempt.createdSessionId,
      redirectUrl: "/",
      navigate: () => void router.invalidate(),
    });
  };

  return (
    <Button onClick={signInWithPasskey} disabled={!isLoaded}>
      {props.children}
    </Button>
  );
}
