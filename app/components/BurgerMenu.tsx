"use client";

import Link from "next/link";
import { useState } from "react";

export default function BurgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
      <button onClick={() => setIsOpen(!isOpen)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "2.5rem",
            right: "0",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Link href="/settings">Settings</Link>
        </div>
      )}
    </div>
  );
}
