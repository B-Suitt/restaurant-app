import { WelcomeView } from "./WelcomeView";

// La vista espera la sesión de la mesa (ver layout): fuera de la validación de navegación instantánea.
export const instant = false;

export default function Page() {
  return <WelcomeView />;
}
