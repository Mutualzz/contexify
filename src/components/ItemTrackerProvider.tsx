import { createContext, type FC, type ReactNode, useContext } from "react";
import type { ItemTracker } from "../hooks";

const Context = createContext(new Map() as ItemTracker);

export const useItemTrackerContext = () => useContext(Context);

export interface ItemTrackerProviderProps {
    value: ItemTracker;
    children?: ReactNode;
}

export const ItemTrackerProvider: FC<ItemTrackerProviderProps> = (props) => (
    <Context.Provider {...props} />
);
