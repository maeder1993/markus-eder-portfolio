'use strict';
// Navigation enhancement only. All content and links work without JavaScript.
const sectionLinks = new Map(
  Array.from(document.querySelectorAll('.nav-links a[href^="#"]'))
    .map(link => [link.getAttribute('href').slice(1), link])
);
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of sectionLinks.values()) link.removeAttribute('aria-current');
      sectionLinks.get(entry.target.id)?.setAttribute('aria-current', 'location');
    }
  }, { rootMargin: '-18% 0px -64% 0px', threshold: 0 });
  for (const id of sectionLinks.keys()) {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  }
}

