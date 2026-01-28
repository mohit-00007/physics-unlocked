/* ========= LIGHTWEIGHT CONVERSION ANALYTICS ========= */

(function () {
  const data = JSON.parse(localStorage.getItem("pu-analytics") || "{}");

  function log(event) {
    data[event] = (data[event] || 0) + 1;
    localStorage.setItem("pu-analytics", JSON.stringify(data));
  }

  // Track WhatsApp clicks
  document.addEventListener("click", e => {
    if (e.target.id === "wa-btn") log("whatsapp_click");
  });

  // Track Apply buttons
  document.querySelectorAll("a").forEach(a => {
    if (a.href && a.href.includes("forms.gle")) {
      a.addEventListener("click", () => log("apply_click"));
    }
  });

  // Track scroll depth
  let maxScroll = 0;
  window.addEventListener("scroll", () => {
    const scrolled =
      (window.scrollY + window.innerHeight) /
      document.documentElement.scrollHeight;

    if (scrolled > maxScroll) {
      maxScroll = scrolled;
      if (maxScroll > 0.5) log("scroll_50");
      if (maxScroll > 0.9) log("scroll_90");
    }
  });
})();
