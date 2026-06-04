const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');

// Replace the matchMedia block entirely
code = code.replace(/ScrollTrigger\.matchMedia\(\{[\s\S]*?\}\);/g, `ScrollTrigger.matchMedia({
        "(min-width: 1201px)": function () {
            gsap.set(section, { clearProps: "all" });
            gsap.set(track, { clearProps: "all" });
            gsap.set(navbar, { clearProps: "all" });
        },
        "(max-width: 1200px)": function () {
            gsap.set(track, { x: 0, paddingLeft: 0, paddingRight: 0 });
            setTimeout(() => {
                const cards = track.querySelectorAll('.event-card');
                if (cards.length === 0) return;
                const windowWidth = window.innerWidth;
                const cardWidth = cards[0].offsetWidth;
                const centerPadding = (windowWidth - cardWidth) / 2;
                gsap.set(track, { paddingLeft: centerPadding + "px", paddingRight: centerPadding + "px" });
                let distanceToMove = track.scrollWidth - windowWidth;
                if (distanceToMove <= 0) return;
                const anim = gsap.to(track, { x: -distanceToMove, ease: "none" });
                ScrollTrigger.create({
                    trigger: section,
                    start: "top top",
                    end: () => "+=" + distanceToMove,
                    pin: true,
                    pinSpacing: true,
                    animation: anim,
                    scrub: 1,
                    invalidateOnRefresh: true,
                    onToggle: self => {
                        if (self.isActive) gsap.to(navbar, { yPercent: -150, duration: 0.4, ease: "power2.out" });
                        else gsap.to(navbar, { yPercent: 0, duration: 0.4, ease: "power2.in" });
                    }
                });
            }, 100);
        }
    });`);
fs.writeFileSync('assets/js/main.js', code);
