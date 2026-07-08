"use client";
import React from "react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary"></div>
        <p className="mt-4 text-lg text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
