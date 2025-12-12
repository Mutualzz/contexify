export const enum EVENT {
    HIDE_ALL,
}

export const NOOP = () => {};

export const hideOnEvents: (keyof GlobalEventHandlersEventMap)[] = [
    "resize",
    "contextmenu",
    "click",
    "scroll",

    // comment blur in dev so you can toggle console without closing the menu
    "blur",
];
