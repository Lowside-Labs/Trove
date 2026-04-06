import IconAppearanceDarkMode from "central-icons/IconAppearanceDarkMode";
import IconMoon from "central-icons/IconMoon";
import IconSun from "central-icons/IconSun";
import type { ThemePreference } from "trove-contracts";
import { cn } from "../lib/cn";
import { useTheme } from "../hooks/use-theme";

const options: { value: ThemePreference; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "system", label: "System", icon: IconAppearanceDarkMode },
  { value: "dark", label: "Dark", icon: IconMoon },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          className={cn(
            "cursor-pointer rounded-md p-1.5 transition-colors",
            preference === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          type="button"
          title={label}
          onClick={() => setPreference(value)}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
