"use client";

import { SessionProvider } from "next-auth/react";

interface SessionProviderWrapperProps {
  children: React.ReactNode;
}

export default function SessionProviderWrapper({ children }: SessionProviderWrapperProps) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus={true}>
      {children}
    </SessionProvider>
  );
}
