import { type FC, type ReactNode, useEffect, useRef, useState } from "react";

import type { CSSObject } from "@emotion/react";
import { Button, Paper, type PaperProps, useTheme } from "@mutualzz/ui-web";
import { useItemTracker } from "../hooks";
import type {
    BooleanPredicate,
    HandlerParamsEvent,
    InternalProps,
} from "../types";
import { cloneItems, getPredicateValue } from "../utils";
import { Arrow } from "./Arrow";
import {
    ItemTrackerProvider,
    useItemTrackerContext,
} from "./ItemTrackerProvider";

export interface SubMenuProps
    extends InternalProps, Omit<PaperProps, "hidden" | "disabled" | "style"> {
    label: ReactNode;
    children: ReactNode;
    arrow?: ReactNode;
    disabled?: BooleanPredicate;
    hidden?: BooleanPredicate;
    inverted?: boolean;
    style?: CSSObject;
}

const CLOSE_DELAY_MS = 140;

export const Submenu: FC<SubMenuProps> = ({
    arrow,
    children,
    disabled = false,
    hidden = false,
    label,
    color,
    triggerEvent,
    propsFromTrigger,
    style,
    inverted,
    ...rest
}) => {
    const { theme } = useTheme();

    const parentItemTracker = useItemTrackerContext();
    const itemTracker = useItemTracker();
    const submenuNode = useRef<HTMLDivElement>(null);

    const handlerParams = {
        triggerEvent: triggerEvent as HandlerParamsEvent,
        props: propsFromTrigger,
    };

    const isDisabled = getPredicateValue(disabled, handlerParams);
    const isHidden = getPredicateValue(hidden, handlerParams);

    const closeTimer = useRef<number | null>(null);
    const [open, setOpen] = useState(false);

    function clearCloseTimer() {
        if (closeTimer.current != null) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }

    function scheduleClose() {
        clearCloseTimer();
        closeTimer.current = window.setTimeout(() => {
            setOpen(false);
            closeTimer.current = null;
        }, CLOSE_DELAY_MS);
    }

    useEffect(() => {
        return () => clearCloseTimer();
    }, []);

    function setPosition() {
        const node = submenuNode.current;
        if (!node) return;

        const sidePadding = `calc(100% + ${theme.spacing(3)})`;
        const negativePadding = `calc(-1 * ${theme.spacing(2)})`;

        node.style.top = negativePadding;
        node.style.left = sidePadding;
        node.style.bottom = "unset";
        node.style.right = "unset";

        let rect = node.getBoundingClientRect();

        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;

        if (rect.right > vw && rect.width < rect.left) {
            node.style.right = sidePadding;
            node.style.left = "unset";
            rect = node.getBoundingClientRect();
        }

        if (rect.bottom > vh && rect.height < rect.top) {
            node.style.top = "unset";
            node.style.bottom = negativePadding;
            rect = node.getBoundingClientRect();
        }
    }

    function trackRef(node: HTMLElement | null) {
        if (node && !isDisabled) {
            parentItemTracker.set(node, {
                node,
                isSubmenu: true,
                submenuRefTracker: itemTracker,
                setSubmenuPosition: setPosition,
            });
        }
    }

    if (isHidden) return null;

    return (
        <ItemTrackerProvider value={itemTracker}>
            <Paper
                ref={trackRef}
                position="relative"
                tabIndex={-1}
                role="menuitem"
                aria-haspopup
                aria-disabled={isDisabled}
                variant="plain"
                onPointerEnter={() => {
                    if (isDisabled) return;
                    clearCloseTimer();
                    setPosition();
                    setOpen(true);
                }}
                onPointerLeave={() => {
                    if (isDisabled) return;
                    scheduleClose();
                }}
                onTouchStart={() => {
                    if (isDisabled) return;
                    clearCloseTimer();
                    setPosition();
                    setOpen(true);
                }}
                {...rest}
            >
                <Button
                    variant="plain"
                    aria-disabled={isDisabled}
                    color={color ?? "#ffffff"}
                    disabled={isDisabled}
                    horizontalAlign="left"
                    size="sm"
                    css={{ width: "100%", borderRadius: 6 }}
                    {...(inverted
                        ? { startDecorator: arrow ?? <Arrow /> }
                        : { endDecorator: arrow ?? <Arrow /> })}
                >
                    {label}
                </Button>

                <Paper
                    position="absolute"
                    spacing={1}
                    ref={submenuNode}
                    role="menu"
                    tabIndex={-1}
                    elevation={5}
                    boxShadow={2}
                    borderRadius={8}
                    minWidth="10rem"
                    boxSizing="border-box"
                    color={color as string}
                    zIndex={theme.zIndex.tooltip}
                    direction="column"
                    padding={2}
                    css={{
                        transition: "opacity .12s",
                        opacity: open ? 1 : 0,
                        visibility: open ? "visible" : "hidden",
                        pointerEvents: open ? "auto" : "none",
                        ...style,
                    }}
                    {...rest}
                >
                    {cloneItems(children, {
                        propsFromTrigger,
                        // @ts-expect-error injected by parent
                        triggerEvent,
                    })}
                </Paper>
            </Paper>
        </ItemTrackerProvider>
    );
};
