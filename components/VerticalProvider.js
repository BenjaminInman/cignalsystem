"use client";

import { createContext, useContext } from "react";

const VerticalContext = createContext(null);

export function VerticalProvider({ vertical, children }) {
  return <VerticalContext.Provider value={vertical}>{children}</VerticalContext.Provider>;
}

export function useVertical() {
  return useContext(VerticalContext);
}
