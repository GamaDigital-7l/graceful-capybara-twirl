import { useTheme } from "next-themes";

interface AppLogoProps {
  className?: string;
  loading?: "lazy" | "eager" | undefined; // Added loading prop
}

export function AppLogo({ className, loading }: AppLogoProps) {
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? "/logo-gama-dark.png" : "/logo-gama-light.png";

  return (
    <img src={logoSrc} alt="Gama Creative Logo" className={className} loading={loading} />
  );
}