import IconCircleCheck from "central-icons-filled/IconCircleCheck";
import IconWorld from "central-icons/IconWorld";
import type { PropsWithChildren, ReactNode } from "react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/cn";
import { useIsDark } from "../../hooks/use-is-dark";

const GRADIENT_LIGHT =
  "linear-gradient(180deg, oklch(0.94 0.012 270) 0%, oklch(0.97 0.006 280) 40%, oklch(1 0 0) 100%)";
const GRADIENT_DARK =
  "linear-gradient(180deg, oklch(0.18 0.012 270) 0%, oklch(0.16 0.006 280) 40%, oklch(0.145 0 0) 100%)";

function Root({ children }: PropsWithChildren) {
  const isDark = useIsDark();

  return (
    <main
      className="fixed inset-0 z-50 overflow-y-auto bg-background px-8 pt-[38px] pb-12 text-foreground md:px-14 md:pb-16"
      style={{ background: isDark ? GRADIENT_DARK : GRADIENT_LIGHT }}
    >
      {/* macOS draggable region */}
      <div
        className="fixed top-0 right-0 left-0 z-10 h-[38px]"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />
      <div className="relative mx-auto flex min-h-full w-full max-w-[980px] flex-col items-center justify-center">
        <section className="w-full">
          <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function Header({ children }: PropsWithChildren) {
  return <div className="space-y-4">{children}</div>;
}

function Brand({ children }: PropsWithChildren) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      <IconWorld className="size-6 relative top-0.25" />
      <p className="text-xl font-medium">{children}</p>
    </div>
  );
}

function Title({ children }: PropsWithChildren) {
  return (
    <h1 className="whitespace-pre-line text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
      {children}
    </h1>
  );
}

function Description({ children }: PropsWithChildren) {
  return (
    <p className="mx-auto mt-1 max-w-[40ch] text-lg leading-relaxed text-muted-foreground text-balance">
      {children}
    </p>
  );
}

function Content({ children }: PropsWithChildren) {
  return <div className="mt-12 w-full">{children}</div>;
}

function Actions({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col items-stretch gap-3">
      {primary}
      {secondary}
    </div>
  );
}

function SecondaryAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick(): void;
}) {
  return (
    <Button className="w-full" shape="square" size="lg" variant="ghost" onClick={onClick}>
      {children}
    </Button>
  );
}

function StepBody({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-16 text-center">
      {children}
    </div>
  );
}

function Stack({ children }: PropsWithChildren) {
  return <div className="flex w-full flex-col gap-2">{children}</div>;
}

function SelectionCard({
  children,
  description,
  isSelected,
  logo,
  onClick,
  title,
}: {
  children?: ReactNode;
  description?: string | undefined;
  isSelected: boolean;
  logo?: ReactNode;
  onClick(): void;
  title?: string | undefined;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "w-full cursor-pointer rounded-2xl p-6 text-left transition-all duration-200 select-none",
        isSelected
          ? "bg-background shadow-outline-1 shadow-xl"
          : "bg-background shadow-sm",
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-2.5">
        {logo && (
          <div
            className={cn(
              "flex size-6 shrink-0 items-center justify-center transition-opacity duration-150",
              isSelected ? "opacity-100" : "opacity-40",
            )}
          >
            {logo}
          </div>
        )}
        {title && (
          <p className="text-lg font-medium text-foreground">{title}</p>
        )}
        <div className="ml-auto flex size-6 shrink-0 items-center justify-center">
          {isSelected ? (
            <IconCircleCheck className="size-6 text-foreground" />
          ) : (
            <div className="size-6 rounded-full bg-foreground/4" />
          )}
        </div>
      </div>
      {description && (
        <p
          className={cn(
            "mt-2 text-[13px] text-muted-foreground",
            logo && "pl-[34px]",
          )}
        >
          {description}
        </p>
      )}
      {children && (
        <div
          className={cn("mt-3", logo && "pl-[34px]")}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export const OnboardingLayout = {
  Root,
  Header,
  Brand,
  Title,
  Description,
  Content,
  Actions,
  SecondaryAction,
  StepBody,
  Stack,
  SelectionCard,
};
