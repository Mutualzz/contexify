import { type FC, type ReactNode, useRef } from "react";

import { Button, type ButtonProps } from "@mutualzz/ui-web";
import { NOOP } from "../constants";
import { contextMenu } from "../core";
import type {
    BooleanPredicate,
    BuiltInOrString,
    HandlerParamsEvent,
    InternalProps,
    ItemParams,
} from "../types";
import { getPredicateValue, isFn } from "../utils";
import { useItemTrackerContext } from "./ItemTrackerProvider";

export interface ItemProps
    extends
        InternalProps,
        Omit<ButtonProps, "hidden" | "disabled" | "onClick"> {
    /**
     * Any valid node that can be rendered
     */
    children: ReactNode;

    /**
     * Passed to the `Item` onClick callback. Accessible via `data`
     */
    data?: any;

    /**
     * Disable `Item`. If a function is used, a boolean must be returned
     *
     * @param id The item id, when defined
     * @param props The props passed when you called `show(e, {props: yourProps})`
     * @param data The data defined on the `Item`
     * @param triggerEvent The event that triggered the context menu
     *
     *
     * ```
     * function isItemDisabled({ triggerEvent, props, data }: PredicateParams<type of props, type of data>): boolean
     * <Item disabled={isItemDisabled} data={data}>content</Item>
     * ```
     */
    disabled?: BooleanPredicate;

    /**
     * Hide the `Item`. If a function is used, a boolean must be returned
     *
     * @param id The item id, when defined
     * @param props The props passed when you called `show(e, {props: yourProps})`
     * @param data The data defined on the `Item`
     * @param triggerEvent The event that triggered the context menu
     *
     *
     * ```
     * function isItemHidden({ triggerEvent, props, data }: PredicateParams<type of props, type of data>): boolean
     * <Item hidden={isItemHidden} data={data}>content</Item>
     * ```
     */
    hidden?: BooleanPredicate;

    /**
     * Callback when the `Item` is clicked.
     *
     * @param id The item id, when defined
     * @param event The event that occured on the Item node
     * @param props The props passed when you called `show(e, {props: yourProps})`
     * @param data The data defined on the `Item`
     * @param triggerEvent The event that triggered the context menu
     *
     * ```
     * function handleItemClick({ id, triggerEvent, event, props, data }: ItemParams<type of props, type of data>){
     *    // retrieve the id of the Item
     *    console.log(id) // item-id
     *
     *    // access any other dom attribute
     *    console.log(event.currentTarget.dataset.foo) // 123
     *
     *    // access the props and the data
     *    console.log(props, data);
     *
     *    // access the coordinate of the mouse when the menu has been displayed
     *    const {  clientX, clientY } = triggerEvent;
     * }
     *
     * <Item id="item-id" onClick={handleItemClick} data={{key: 'value'}} data-foo={123} >Something</Item>
     * ```
     */
    onClick?: (args: ItemParams) => void;

    /**
     * Let you implement keyboard shortcut for the menu item. It will trigger the
     * `onClick` hander if the given callback returns `true`
     *
     * example:
     *
     * ```
     * function handleShortcut(e: React.KeyboardEvent<HTMLElement>){
     *   // let's say we want to match ⌘ + c
     *   return e.metaKey && e.key === "c";
     * }
     *
     * <Item onClick={doSomething}>Copy <RightSlot>⌘ C</RightSlot></Item>
     * ```
     */
    keyMatcher?: (e: KeyboardEvent) => boolean;

    /**
     * Useful when using form input inside the Menu
     *
     * default: `true`
     */
    closeOnClick?: boolean;

    /**
     * Let you specify another event for the `onClick` handler
     *
     * default: `onClick`
     */
    handlerEvent?: BuiltInOrString<"onClick" | "onMouseDown" | "onMouseUp">;
}

export const Item: FC<ItemProps> = ({
    id,
    children,
    className,
    style,
    triggerEvent,
    data,
    propsFromTrigger,
    keyMatcher,
    onClick = NOOP,
    disabled = false,
    hidden = false,
    closeOnClick = true,
    handlerEvent = "onClick",
    ...rest
}) => {
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

        if (!isDisabled) {
            !closeOnClick ? onClick(handlerParams) : dispatchUserHandler();
        }
    }

    // provide a feedback to the user that the item has been clicked before closing the menu
    function dispatchUserHandler() {
        const node = itemNode.current!;
        node.focus();
        node.addEventListener(
            "blur",
            // defer, required for react 17
            () => setTimeout(contextMenu.hideAll),
            { once: true },
        );

        onClick(handlerParams);
    }

    function registerItem(node: HTMLElement | null) {
        if (node && !isDisabled) {
            itemNode.current = node;
            itemTracker.set(node, {
                node,
                isSubmenu: false,
                keyMatcher:
                    !isDisabled &&
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
            onKeyDown={handleKeyDown}
            ref={registerItem}
            tabIndex={-1}
            role="menuitem"
            aria-disabled={isDisabled}
            disabled={isDisabled}
            horizontalAlign="left"
            variant="plain"
            color="neutral"
            size="sm"
            css={{
                borderRadius: 6,
                width: "100%",
                ...style,
            }}
            fullWidth
            {...{ ...rest, [handlerEvent]: handleClick }}
        >
            {children}
        </Button>
    );
};
