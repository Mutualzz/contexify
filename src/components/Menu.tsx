import {
    forwardRef,
    type ReactNode,
    useEffect,
    useReducer,
    useRef,
    useState,
} from "react";

import { ItemTrackerProvider } from "./ItemTrackerProvider";

import { Paper, type PaperProps, useTheme } from "@mutualzz/ui-web";
import { flushSync } from "react-dom";
import { EVENT, hideOnEvents } from "../constants";
import type { ShowContextMenuParams } from "../core";
import { eventManager } from "../core";
import { useItemTracker } from "../hooks";
import type { MenuId, TriggerEvent } from "../types";
import { cloneItems, getMousePosition, isFn } from "../utils";
import { createKeyboardController } from "./keyboardController";

export interface MenuProps extends Omit<PaperProps, "id"> {
    /**
     * Unique id to identify the menu. Use to Trigger the corresponding menu
     */
    id: MenuId;

    /**
     * Any valid node that can be rendered
     */
    children: ReactNode;

    /**
     * Disables menu repositioning if outside screen.
     * This may be needed in some cases when using custom position.
     */
    disableBoundariesCheck?: boolean;

    /**
     * Prevents scrolling the window on when typing. Defaults to true.
     */
    preventDefaultOnKeydown?: boolean;

    /**
     * Used to track menu visibility
     */
    onVisibilityChange?: (isVisible: boolean) => void;
}

interface MenuState {
    x: number;
    y: number;
    visible: boolean;
    triggerEvent: TriggerEvent;
    propsFromTrigger: any;
    willLeave: boolean;
}

function reducer(
    state: MenuState,
    payload: Partial<MenuState> | ((state: MenuState) => Partial<MenuState>),
) {
    return { ...state, ...(isFn(payload) ? payload(state) : payload) };
}

const Menu = forwardRef<HTMLDivElement, MenuProps>(
    (
        {
            id,
            style,
            color,
            className,
            children,
            preventDefaultOnKeydown = true,
            disableBoundariesCheck = false,
            onVisibilityChange,
            ...rest
        },
        ref,
    ) => {
        const { theme } = useTheme();

        const [state, setState] = useReducer(reducer, {
            x: 0,
            y: 0,
            visible: false,
            triggerEvent: {} as TriggerEvent,
            propsFromTrigger: null,
            willLeave: false,
        });
        const nodeRef = useRef<HTMLDivElement>(null);
        const itemTracker = useItemTracker();
        const [menuController] = useState(() => createKeyboardController());
        const wasVisible = useRef<boolean>(undefined);
        const visibilityId = useRef<number>(undefined);

        // subscribe event manager
        useEffect(() => {
            eventManager.on(id, show).on(EVENT.HIDE_ALL, hide);

            return () => {
                eventManager.off(id, show).off(EVENT.HIDE_ALL, hide);
            };
            // hide rely on setState(dispatch), which is guaranteed to be the same across render
        }, [id, disableBoundariesCheck]);

        // collect menu items for keyboard navigation
        useEffect(() => {
            !state.visible
                ? itemTracker.clear()
                : menuController.init(itemTracker);
        }, [state.visible, menuController, itemTracker]);

        function checkBoundaries(x: number, y: number) {
            if (nodeRef.current && !disableBoundariesCheck) {
                const { innerWidth, innerHeight } = window;
                const { offsetWidth, offsetHeight } = nodeRef.current;

                if (x + offsetWidth > innerWidth)
                    x -= x + offsetWidth - innerWidth;

                if (y + offsetHeight > innerHeight)
                    y -= y + offsetHeight - innerHeight;
            }

            return { x, y };
        }

        // when the menu is transitioning from not visible to visible,
        // the nodeRef is attached to the dom element this let us check the boundaries
        useEffect(() => {
            // state.visible and state{x,y} are updated together
            if (state.visible) setState(checkBoundaries(state.x, state.y));
        }, [state.visible]);

        // subscribe dom events
        useEffect(() => {
            function preventDefault(e: KeyboardEvent) {
                if (preventDefaultOnKeydown) e.preventDefault();
            }

            function handleKeyboard(e: KeyboardEvent) {
                switch (e.key) {
                    case "Enter":
                    case " ":
                        if (!menuController.openSubmenu()) hide();
                        break;
                    case "Escape":
                        hide();
                        break;
                    case "ArrowUp":
                        preventDefault(e);
                        menuController.moveUp();
                        break;
                    case "ArrowDown":
                        preventDefault(e);
                        menuController.moveDown();
                        break;
                    case "ArrowRight":
                        preventDefault(e);
                        menuController.openSubmenu();
                        break;
                    case "ArrowLeft":
                        preventDefault(e);
                        menuController.closeSubmenu();
                        break;
                    default:
                        menuController.matchKeys(e);
                        break;
                }
            }

            if (state.visible) {
                window.addEventListener("keydown", handleKeyboard);

                for (const ev of hideOnEvents)
                    window.addEventListener(ev, hide);
            }

            return () => {
                window.removeEventListener("keydown", handleKeyboard);

                for (const ev of hideOnEvents)
                    window.removeEventListener(ev, hide);
            };
        }, [state.visible, menuController, preventDefaultOnKeydown]);

        function show({ event, props, position }: ShowContextMenuParams) {
            event.stopPropagation();
            const p = position || getMousePosition(event);
            // check boundaries when the menu is already visible
            const { x, y } = checkBoundaries(p.x, p.y);

            flushSync(() => {
                setState({
                    visible: true,
                    willLeave: false,
                    x,
                    y,
                    triggerEvent: event,
                    propsFromTrigger: props,
                });
            });

            clearTimeout(visibilityId.current);
            if (!wasVisible.current && isFn(onVisibilityChange)) {
                onVisibilityChange(true);
                wasVisible.current = true;
            }
        }

        function hide(e?: Event) {
            type SafariEvent = KeyboardEvent & MouseEvent;

            if (
                e != null &&
                // Safari trigger a click event when you ctrl + trackpad
                ((e as SafariEvent).button === 2 ||
                    (e as SafariEvent).ctrlKey) &&
                // Firefox trigger a click event when right click occur
                e.type !== "contextmenu"
            )
                return;

            setState((state) => ({
                visible: state.visible ? false : state.visible,
            }));

            visibilityId.current = window?.setTimeout(() => {
                isFn(onVisibilityChange) && onVisibilityChange(false);
                wasVisible.current = false;
            });
        }

        const { visible, triggerEvent, propsFromTrigger, x, y } = state;

        return (
            <ItemTrackerProvider value={itemTracker}>
                {visible && (
                    <Paper
                        position="fixed"
                        direction="column"
                        spacing={1}
                        color={color as string}
                        css={{
                            left: x,
                            top: y,
                            opacity: 1,
                            visibility: "visible",
                            userSelect: "none",
                            ...style,
                        }}
                        elevation={7}
                        boxShadow={2}
                        borderRadius={8}
                        minWidth="10rem"
                        boxSizing="border-box"
                        zIndex={theme.zIndex.tooltip}
                        padding={2}
                        ref={ref ?? nodeRef}
                        role="menu"
                        {...rest}
                    >
                        {cloneItems(children, {
                            propsFromTrigger,
                            triggerEvent,
                        })}
                    </Paper>
                )}
            </ItemTrackerProvider>
        );
    },
);

Menu.displayName = "Menu";

export { Menu };
