"use client";

import { createContext, useContext } from "react";

const VerticalContext = createContext(null);
const ContentContext = createContext(null);

export function VerticalProvider({ vertical, content, children }) {
  return (
    <VerticalContext.Provider value={vertical}>
      <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
    </VerticalContext.Provider>
  );
}

export function useVertical() {
  return useContext(VerticalContext);
}

export function useContent() {
  return useContext(ContentContext) || {};
}
