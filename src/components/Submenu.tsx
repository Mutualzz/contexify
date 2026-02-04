import { type FC, type ReactNode, useRef, useState } from "react";

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
    /**
     * Any valid node that can be rendered
     */
    label: ReactNode;

    /**
     * Any valid node that can be rendered
     */
    children: ReactNode;

    /**
     * Render a custom arrow
     */
    arrow?: ReactNode;

    /**
     * Disable the `Submenu`. If a function is used, a boolean must be returned
     */
    disabled?: BooleanPredicate;

    /**
     * Hide the `Submenu` and his children. If a function is used, a boolean must be returned
     */
    hidden?: BooleanPredicate;

    style?: CSSObject;
}

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
    const [hovered, setHovered] = useState(false);

    function setPosition() {
        const node = submenuNode.current;
        if (node) {
            const rect = node.getBoundingClientRect();

            const sidePadding = `calc(100% + ${theme.spacing(3)})`;
            const negativePadding = `calc(-1 * ${theme.spacing(2)})`;

            node.style.top = negativePadding;
            node.style.left = sidePadding;
            node.style.bottom = "unset";
            node.style.right = "unset";

            if (rect.right > window.innerWidth) {
                node.style.right = sidePadding;
                node.style.left = "unset";
            }

            if (rect.bottom > window.innerHeight) {
                node.style.top = "unset";
                node.style.bottom = negativePadding;
            }
        }
    }

    function trackRef(node: HTMLElement | null) {
        if (node && !isDisabled)
            parentItemTracker.set(node, {
                node,
                isSubmenu: true,
                submenuRefTracker: itemTracker,
                setSubmenuPosition: setPosition,
            });
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
                onMouseEnter={setPosition}
                onTouchStart={setPosition}
                onMouseOver={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                {...rest}
                variant="plain"
            >
                <Button
                    variant="plain"
                    aria-disabled={isDisabled}
                    color={color ?? "#ffffff"}
                    disabled={isDisabled}
                    horizontalAlign="left"
                    size="sm"
                    css={{
                        width: "100%",
                        borderRadius: 6,
                    }}
                    endDecorator={arrow ?? <Arrow />}
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
                    zIndex={theme.zIndex.tooltip}
                    visibility={hovered ? "visible" : "hidden"}
                    padding={2}
                    css={{
                        transition: "opacity .265s",
                        pointerEvents: "auto",
                        opacity: hovered ? 1 : 0,
                        ...style,
                    }}
                    {...rest}
                >
                    {cloneItems(children, {
                        propsFromTrigger,
                        // @ts-expect-error: injected by the parent
                        triggerEvent,
                    })}
                </Paper>
            </Paper>
        </ItemTrackerProvider>
    );
};
