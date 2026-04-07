import IconAppearanceDarkMode from "central-icons/IconAppearanceDarkMode";
import IconMoon from "central-icons/IconMoon";
import IconSun from "central-icons/IconSun";
import type { ThemePreference } from "trove-contracts";
import { useTheme } from "../hooks/use-theme";
import { Button } from "./ui/button";
import { Menu } from "./ui/menu";

const options: { value: ThemePreference; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "system", label: "System", icon: IconAppearanceDarkMode },
  { value: "dark", label: "Dark", icon: IconMoon },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const current = preference ?? "system";
  const CurrentIcon = options.find((option) => option.value === current)?.icon ?? IconSun;

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button
            className="rounded-xl"
            variant="secondary"
            size="icon"
          >
            <CurrentIcon className="size-4" />
            <span className="sr-only">Theme</span>
          </Button>
        }
      />
      <Menu.Content side="top" align="start">
        {options.map(({ value, label, icon: Icon }) => (
          <Menu.Item key={value} onClick={() => setPreference(value)}>
            <Icon className="size-4 text-muted-foreground" />
            <span>{label}</span>
            {current === value ? (
              <span className="ml-auto text-[12px] text-muted-foreground">✓</span>
            ) : null}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}
