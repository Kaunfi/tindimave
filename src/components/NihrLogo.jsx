import React, { useState } from "react";
import defaultLogo from "../img/nihr-logo.png";

export default function NihrLogo({ className = "h-8 w-8" }) {
  const [errored, setErrored] = useState(false);
  const url = (typeof window !== "undefined" && window.NIHR_LOGO_URL) || defaultLogo;
  const sharedClasses = `rounded-md ${className}`;

  if (errored || !url) {
    return (
      <div
        aria-label="Nihr logo placeholder"
        className={`${sharedClasses} bg-blue-950 grid place-items-center text-[10px] text-blue-300`}
        title="Logo unavailable"
      >
        NI
      </div>
    );
  }

  return <img src={url} alt="Nihr logo" className={`${sharedClasses} object-cover`} onError={() => setErrored(true)} />;
}
