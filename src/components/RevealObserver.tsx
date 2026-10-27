"use client";

import { useEffect } from "react";

export function RevealObserver() {
  useEffect(() => {
    const targets = new WeakSet<Element>();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer?.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }) : null;
    const reveal = (element: Element) => {
      if (targets.has(element)) return;
      targets.add(element);
      if (reducedMotion || !observer) {
        element.classList.add("is-revealed");
        return;
      }
      observer?.observe(element);
    };

    document.documentElement.dataset.revealReady = "true";
    document.querySelectorAll("[data-reveal]").forEach(reveal);
    const mutations = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches("[data-reveal]")) reveal(node);
        node.querySelectorAll("[data-reveal]").forEach(reveal);
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      observer?.disconnect();
      delete document.documentElement.dataset.revealReady;
    };
  }, []);

  return null;
}
