import {
  ErrorComponent,
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";

function TryAgainButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        void router.invalidate();
      }}
      className="rounded bg-gray-600 px-6 py-1 text-white transition-colors hover:bg-gray-700"
    >
      Try again
    </button>
  );
}

function GoBackButton() {
  return (
    <button
      onClick={() => {
        window.history.back();
      }}
      className="rounded bg-gray-600 px-6 py-1 text-white transition-colors hover:bg-gray-700"
    >
      Go back
    </button>
  );
}

function StartOverButton() {
  return (
    <Link
      to="/"
      className="rounded bg-gray-600 px-6 py-1 text-white transition-colors hover:bg-gray-700"
    >
      Start over
    </Link>
  );
}

export function NotFound(props: React.PropsWithChildren) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-5">
      <div className="font-medium">
        {props.children ?? "The page you are looking for does not exist"}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <GoBackButton />
        <StartOverButton />
      </div>
    </div>
  );
}

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  console.error("DefaultCatchBoundary Error:", error);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-5">
      <ErrorComponent error={error} />
      <div className="flex flex-wrap items-center gap-2">
        <TryAgainButton />
        <GoBackButton />
        <StartOverButton />
      </div>
    </div>
  );
}
