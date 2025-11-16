import React, { useState } from "react";

import btcLogo from "../img/BTC.svg";
import ethLogo from "../img/ETH.svg";
import hypeLogo from "../img/HYPE.svg";
import pumpLogo from "../img/PUMP.svg";
import solLogo from "../img/SOL.svg";
import xplLogo from "../img/XPL.svg";

const TOKEN_FALLBACK_CLASS =
  "w-5 h-5 rounded border border-blue-900 bg-[#0f1b38] text-[10px] font-semibold text-blue-200 grid place-items-center";

const BUILTIN_TOKEN_LOGOS = {
  btc: btcLogo,
  eth: ethLogo,
  hype: hypeLogo,
  pump: pumpLogo,
  sol: solLogo,
  xpl: xplLogo,
};

export default function TokenLogo({ base }) {
  const [errored, setErrored] = useState(false);
  const symbol = (base || "").slice(0, 4).toUpperCase() || "?";

  const normalized = String(base || "").toLowerCase();
  const builtinSrc = normalized && BUILTIN_TOKEN_LOGOS[normalized];

  if (builtinSrc && !errored) {
    return (
      <img
        src={builtinSrc}
        alt={`${base} token logo`}
        className="w-5 h-5 rounded"
        onError={() => setErrored(true)}
      />
    );
  }

  if (errored || !base) {
    return (
      <div aria-hidden className={TOKEN_FALLBACK_CLASS}>
        {symbol}
      </div>
    );
  }

  return (
    <img
      src={`/tokens/${normalized}.png`}
      alt={`${base} token logo`}
      className="w-5 h-5 rounded"
      onError={() => setErrored(true)}
    />
  );
}
