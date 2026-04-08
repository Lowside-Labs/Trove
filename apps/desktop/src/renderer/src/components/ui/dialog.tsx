import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentProps, CSSProperties } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";

interface ScrollState {
  atTop: boolean;
  atBottom: boolean;
}

interface DialogScrollContextValue extends ScrollState {
  setScrollState(state: ScrollState): void;
}

const DialogScrollContext = createContext<DialogScrollContextValue>({
  atTop: true,
  atBottom: true,
  setScrollState: () => {},
});

function useDialogScrollContext() {
  return useContext(DialogScrollContext);
}

const DialogRoot = BaseDialog.Root;
const DialogTrigger = BaseDialog.Trigger;
const DialogClose = BaseDialog.Close;
const DialogPortal = BaseDialog.Portal;
const DialogPopup = BaseDialog.Popup;

function DialogBackdrop({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/20 backdrop-blur-[1.5px]",
        "transition-opacity duration-150",
        "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

type DialogContentProps = ComponentProps<typeof BaseDialog.Popup>;

function DialogContent({ children, className, ...props }: DialogContentProps) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    atTop: true,
    atBottom: true,
  });

  const handleScrollState = useCallback((nextState: ScrollState) => {
    setScrollState(nextState);
  }, []);

  return (
    <DialogPortal>
      <DialogBackdrop />
      <BaseDialog.Popup
        className={cn(
          "fixed inset-0 z-50 mx-auto my-[5vmin] flex h-fit max-h-[calc(100%-10vmin)] flex-col",
          "rounded-3xl bg-popover text-popover-foreground shadow-xl shadow-outline-1 outline-none",
          "transition-[opacity,scale,translate] duration-150 [transition-timing-function:ease-out]",
          "data-[starting-style]:translate-y-2 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
          "data-[ending-style]:translate-y-2 data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0",
          className,
        )}
        style={
          {
            "--dialog-gutter": "24px",
            width: "min(768px, calc(100vw - var(--dialog-gutter) * 2))",
          } as CSSProperties
        }
        {...props}
      >
        <DialogScrollContext.Provider
          value={{
            atTop: scrollState.atTop,
            atBottom: scrollState.atBottom,
            setScrollState: handleScrollState,
          }}
        >
          {children}
        </DialogScrollContext.Provider>
      </BaseDialog.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  const { atTop } = useDialogScrollContext();

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-1.5 px-(--dialog-gutter) pt-(--dialog-gutter) pb-4",
        "border-b",
        atTop ? "border-transparent" : "border-border",
        className,
      )}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: ComponentProps<"div">) {
  const { setScrollState } = useDialogScrollContext();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const updateScrollState = () => {
      const { clientHeight, scrollHeight, scrollTop } = element;
      setScrollState({
        atTop: scrollTop <= 0,
        atBottom: scrollTop + clientHeight >= scrollHeight - 1,
      });
    };

    updateScrollState();

    element.addEventListener("scroll", updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [setScrollState]);

  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 overflow-y-auto px-(--dialog-gutter) py-1",
        "[scrollbar-color:var(--color-muted-foreground)_var(--color-muted)] [scrollbar-width:thin]",
        "[&::-webkit-scrollbar]:w-2",
        "[&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-muted",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  const { atBottom } = useDialogScrollContext();

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 px-(--dialog-gutter) pt-4 pb-(--dialog-gutter) sm:flex-row sm:justify-end",
        "border-t",
        atBottom ? "border-transparent" : "border-border",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      className={cn("text-xl font-semibold leading-none", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Close: DialogClose,
  Content: DialogContent,
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
  Title: DialogTitle,
  Description: DialogDescription,
};

export const DialogPrimitive = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Close: DialogClose,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Popup: DialogPopup,
  Title: DialogTitle,
  Description: DialogDescription,
};
