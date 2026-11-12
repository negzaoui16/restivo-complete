import Homepage from "./homepage/page";
import { StandaloneRedirect } from "./_components/StandaloneRedirect";

// Composant serveur : la page d'accueil lit DEMO_MODE à chaque requête.
export const dynamic = "force-dynamic";

export default function RootPage() {
  return (
    <>
      <StandaloneRedirect />
      <Homepage />
    </>
  );
}
