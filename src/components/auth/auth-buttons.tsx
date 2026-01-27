"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <SignInButton mode="modal">
          <Button>Sign In</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button variant="outline">Sign Up</Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        {/* UserMenu will be shown here via separate component */}
      </SignedIn>
    </div>
  );
}
