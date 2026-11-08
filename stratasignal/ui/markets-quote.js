"use strict";

function marketQuoteFrame(symbols, title) {
  const widget = new URL("https://www.tradingview-widget.com/embed-widget/symbol-overview/?locale=br");
  widget.hash = encodeURIComponent(JSON.stringify({
    symbols, width: "100%", height: "100%", chartType: "area", colorTheme: "light", hideMarketStatus: false,
  }));
  const frame = document.createElement("iframe");
  frame.title = title;
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
  frame.referrerPolicy = "no-referrer";
  frame.src = widget.href;
  return frame;
}
