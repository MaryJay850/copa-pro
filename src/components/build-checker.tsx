"use client";

import { useEffect } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const COOKIE_NAME = "x-build-id";

/**
 * Client-side component that:
 * 1. Sets the build ID cookie on mount (ensures cookie exists for middleware checks)
 * 2. Periodically checks if the cookie was updated by a newer response (middleware stamping)
 * 3. Forces a hard reload when a build mismatch is detected
 *
 * This handles the edge case where a user has a page open during deploy
 * and tries to use server actions from the stale cached page.
 */
export function BuildChecker() {
  useEffect(() => {
    if (!BUILD_ID) return;

    // Set the build cookie on the client side immediately
    document.cookie = `${COOKIE_NAME}=${BUILD_ID}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    // Listen for fetch errors that indicate stale server actions
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args);

        // Check if the server returned a 409 (stale build) for server actions
        if (response.status === 409) {
          const reloadUrl = response.headers.get("x-reload-url");
          if (reloadUrl) {
            console.log("[BuildChecker] Build desatualizado, a recarregar...");
            window.location.href = reloadUrl;
            return response;
          }
        }

        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
