import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function revealAll() {
  document
    .querySelectorAll<HTMLElement>('[data-reveal]:not(.revealed)')
    .forEach((el) => el.classList.add('revealed'));
}

export function useScrollReveal() {
  const location = useLocation();

  useEffect(() => {
    // Fallback: guarantee everything is visible after 2s no matter what
    const fallback = setTimeout(revealAll, 2000);

    if (!window.IntersectionObserver) {
      revealAll();
      return () => clearTimeout(fallback);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '120px 0px 120px 0px' }
    );

    const observe = () => {
      document
        .querySelectorAll<HTMLElement>('[data-reveal]:not(.revealed)')
        .forEach((el) => io.observe(el));
    };

    // Initial pass
    const timer = setTimeout(observe, 60);

    // Catch elements added asynchronously (data fetches, conditional renders)
    const mo = new MutationObserver((mutations) => {
      let found = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.hasAttribute('data-reveal') && !node.classList.contains('revealed')) {
            io.observe(node);
            found = true;
          }
          node.querySelectorAll<HTMLElement>('[data-reveal]:not(.revealed)').forEach((el) => {
            io.observe(el);
            found = true;
          });
        });
      });
      // Immediately reveal in-viewport elements after a micro-tick
      if (found) setTimeout(observe, 0);
    });

    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      clearTimeout(fallback);
      io.disconnect();
      mo.disconnect();
    };
  }, [location.pathname]);
}
