import GelosOS from "./GelosOS";
import { SignIn } from "./SignIn";
import { useSession } from "../lib/auth-client";

export function App() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Segoe UI',system-ui,sans-serif",
          color: "#1a3c5e",
          fontWeight: 700,
          fontSize: "1.1rem",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!session?.user) {
    return <SignIn />;
  }

  return <GelosOS />;
}
