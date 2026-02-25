import React, { type FC, type ReactNode, useRef } from "react";

import { Button, type ButtonProps, useTheme } from "@mutualzz/ui-web";
import { NOOP } from "../constants";
import { contextMenu } from "../core";
import type { BooleanPredicate, BuiltInOrString, HandlerParamsEvent, InternalProps, ItemParams, } from "../types";
import { getPredicateValue, isFn } from "../utils";
import { useItemTrackerContext } from "./ItemTrackerProvider";

export interface ItemProps
    extends
        InternalProps,
        Omit<ButtonProps, "hidden" | "disabled" | "onClick"> {
    children: ReactNode;
    data?: any;
    disabled?: BooleanPredicate;
    hidden?: BooleanPredicate;
    onClick?: (args: ItemParams) => void;
    keyMatcher?: (e: KeyboardEvent) => boolean;
    closeOnClick?: boolean;
    handlerEvent?: BuiltInOrString<"onClick" | "onMouseDown" | "onMouseUp">;
}

export const Item: FC<ItemProps> = ({
    id,
    children,
    style,
    color,
    triggerEvent,
    data,
    propsFromTrigger,
    keyMatcher,
    onClick = NOOP,
    disabled = false,
    hidden = false,
    closeOnClick = true,
    textColor,
    handlerEvent = "onClick",
    ...rest
}) => {
    const { theme } = useTheme();
    const itemNode = useRef<HTMLElement>(undefined);
    const itemTracker = useItemTrackerContext();

    const handlerParams = {
        id,
        data,
        triggerEvent: triggerEvent as HandlerParamsEvent,
        props: propsFromTrigger,
    } as ItemParams;

    const isDisabled = getPredicateValue(disabled, handlerParams);
    const isHidden = getPredicateValue(hidden, handlerParams);

    function handleClick(e: React.MouseEvent<HTMLElement>) {
        handlerParams.event = e;
        e.stopPropagation();

        if (isDisabled) return;

        if (!closeOnClick) {
            onClick(handlerParams);
            return;
        }

        dispatchUserHandler();
    }

    function dispatchUserHandler() {
        const node = itemNode.current!;
        node.focus();
        node.addEventListener("blur", () => setTimeout(contextMenu.hideAll), {
            once: true,
        });

        onClick(handlerParams);
    }

    function registerItem(node: HTMLElement | null) {
        if (node && !isDisabled) {
            itemNode.current = node;
            itemTracker.set(node, {
                node,
                isSubmenu: false,
                keyMatcher:
                    isFn(keyMatcher) &&
                    ((e: KeyboardEvent) => {
                        if (keyMatcher(e)) {
                            e.stopPropagation();
                            e.preventDefault();
                            handlerParams.event = e;
                            dispatchUserHandler();
                        }
                    }),
            });
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            handlerParams.event = e;
            dispatchUserHandler();
        }
    }

    if (isHidden) return null;

    return (
        <Button
            ref={registerItem}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            role="menuitem"
            aria-disabled={isDisabled}
            disabled={isDisabled}
            horizontalAlign="left"
            variant="plain"
            color={color}
            textColor={textColor}
            size="sm"
            css={{
                borderRadius: 6,
                width: "100%",
                ...style,
            }}
            fullWidth
            data-menu-item
            {...(closeOnClick
                ? { "data-menu-close": true }
                : { "data-menu-interactive": true })}
            {...rest}
            {...{ [handlerEvent]: handleClick }}
        >
            {children}
        </Button>
    );
};
