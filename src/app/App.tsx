import GelosOS from "./GelosOS";
import { SignIn } from "./SignIn";
import { useSession } from "../lib/auth-client";

export function App() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="gelos-auth-loading" role="status" aria-live="polite" aria-busy="true">
        <div className="gelos-auth-loading-inner">
          <div className="gelos-auth-loading-ring" aria-hidden />
          <p className="gelos-auth-loading-title">Gelos OS</p>
          <p className="gelos-auth-loading-sub">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return <SignIn />;
  }

  return <GelosOS />;
}
