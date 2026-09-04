(() => {
    "use strict";

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const lerp = (a, b, t) => a + (b - a) * t;

    /* ---------------------------------------------------------- Boot */
    const boot = $("#boot");
    const bootTxt = $("#bootTxt");

    function dismissBoot() {
        if (boot) {
            boot.classList.add("done");
            setTimeout(() => boot.remove(), 700);
        }
        startExperience();
    }

    if (reduced) {
        boot && boot.remove();
        queueMicrotask(startExperience);
    } else {
        const phases = ["booting", "loading modules", "linking systems", "ready"];
        let phase = 0;
        const phaseTimer = setInterval(() => {
            phase = Math.min(phase + 1, phases.length - 1);
            if (bootTxt) bootTxt.textContent = phases[phase];
            if (phase === phases.length - 1) clearInterval(phaseTimer);
        }, 300);
        setTimeout(dismissBoot, 1300);
    }

    /* ------------------------------------------------- Scroll reveal */
    function indexChildren(selector) {
        $$(selector).forEach(parent =>
            [...parent.children].forEach((child, i) => child.style.setProperty("--i", i))
        );
    }

    // Reassigned once reveals are armed; acts as a backstop when IntersectionObserver stays silent.
    let sweepReveals = () => { };

    function startExperience() {
        indexChildren(".cards");
        indexChildren(".timeline");
        indexChildren(".chips");
        indexChildren(".exp-list");

        const pending = new Set($$(".fade"));
        const reveal = el => {
            el.classList.add("show");
            pending.delete(el);
            io.unobserve(el);
            const title = el.querySelector(".title");
            if (title) scramble(title);
        };

        const io = new IntersectionObserver(entries => {
            entries.forEach(e => e.isIntersecting && reveal(e.target));
        }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

        pending.forEach(el => io.observe(el));

        sweepReveals = () => {
            pending.forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.top < innerHeight * 0.88 && r.bottom > 0) reveal(el);
            });
        };

        requestAnimationFrame(sweepReveals);
        addEventListener("visibilitychange", sweepReveals);

        startRoles();
        armTerminal();
    }

    /* ------------------------------------------------ Title scramble */
    const GLYPHS = "!<>-_\\/[]{}=+*^?#01";

    function scramble(el, duration = 900) {
        if (reduced || el.dataset.busy) return;
        const text = el.dataset.text || el.textContent;
        el.dataset.text = text;
        el.dataset.busy = "1";
        el.classList.add("scrambling");

        const seeds = [...text].map(() => Math.random() * 0.55 + 0.15);
        const start = performance.now();

        requestAnimationFrame(function step(now) {
            const p = Math.min(1, (now - start) / duration);
            let out = "";
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (ch === " ") { out += " "; continue; }
                out += p > seeds[i] + (i / text.length) * 0.4
                    ? ch
                    : GLYPHS[(Math.random() * GLYPHS.length) | 0];
            }
            el.textContent = out;
            if (p < 1) return requestAnimationFrame(step);
            el.textContent = text;
            el.classList.remove("scrambling");
            delete el.dataset.busy;
        });
    }

    $$(".title").forEach(t => t.addEventListener("pointerenter", () => scramble(t, 620)));

    /* --------------------------------------------------- Role typing */
    function startRoles() {
        const target = $("#roles");
        if (!target) return;
        const roles = [
            "Android Developer",
            "Linux Self-Hoster",
            "Automotive IVI Engineer",
            "Network Tinkerer"
        ];
        if (reduced) {
            target.textContent = roles[0];
            return;
        }
        let i = 0, char = 0, deleting = false;
        (function tick() {
            const word = roles[i];
            char += deleting ? -1 : 1;
            target.textContent = word.slice(0, char);
            let delay = deleting ? 40 : 75;
            if (!deleting && char === word.length) { delay = 1600; deleting = true; }
            else if (deleting && char === 0) { deleting = false; i = (i + 1) % roles.length; delay = 320; }
            setTimeout(tick, delay);
        })();
    }

    /* ----------------------------------------------- Terminal typing */
    function armTerminal() {
        const pre = $("#termText");
        if (!pre || reduced) return;
        const text = pre.textContent;
        pre.textContent = "";

        const run = () => {
            pre.classList.add("typing");
            let shown = 0, last = performance.now(), acc = 0;
            const speed = 14;
            requestAnimationFrame(function step(now) {
                acc += now - last;
                last = now;
                while (acc >= speed && shown < text.length) { acc -= speed; shown++; }
                pre.textContent = text.slice(0, shown);
                if (shown < text.length) requestAnimationFrame(step);
                else setTimeout(() => pre.classList.remove("typing"), 2400);
            });
        };

        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                obs.disconnect();
                setTimeout(run, 450);
            });
        }, { threshold: 0.2 });
        io.observe(pre);
    }

    /* ------------------------------------------------------- Marquee */
    const track = $(".marquee-track");
    if (track) track.append(...[...track.children].map(n => n.cloneNode(true)));

    /* ------------------------------------------- Blob + custom cursor */
    const blob = $("#blob");
    const dot = $("#cursorDot");
    const ring = $("#cursorRing");
    const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
    const blobPos = { x: pointer.x, y: pointer.y };
    const ringPos = { x: pointer.x, y: pointer.y };

    if (finePointer && !reduced) {
        document.body.classList.add("cursor-on");
        let running = false;

        const follow = () => {
            blobPos.x = lerp(blobPos.x, pointer.x, 0.06);
            blobPos.y = lerp(blobPos.y, pointer.y, 0.06);
            ringPos.x = lerp(ringPos.x, pointer.x, 0.18);
            ringPos.y = lerp(ringPos.y, pointer.y, 0.18);
            if (blob) blob.style.transform = `translate3d(${blobPos.x}px, ${blobPos.y}px, 0)`;
            if (ring) ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;

            const settled = Math.hypot(pointer.x - blobPos.x, pointer.y - blobPos.y) < 0.5 &&
                Math.hypot(pointer.x - ringPos.x, pointer.y - ringPos.y) < 0.5;
            if (settled) running = false;
            else requestAnimationFrame(follow);
        };

        // Idle frames are skipped so the blurred blob layer stops repainting.
        const wake = () => {
            if (running) return;
            running = true;
            requestAnimationFrame(follow);
        };

        addEventListener("pointermove", e => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            if (dot) dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            wake();
        }, { passive: true });

        addEventListener("pointerdown", () => ring && ring.classList.add("hot"));
        addEventListener("pointerup", () => ring && ring.classList.remove("hot"));

        $$("a, button, .card, .chips span").forEach(el => {
            el.addEventListener("pointerenter", () => ring && ring.classList.add("hot"));
            el.addEventListener("pointerleave", () => ring && ring.classList.remove("hot"));
        });

        const cursorLabel = $("#cursorLabel");
        $$("[data-cursor]").forEach(el => {
            el.addEventListener("pointerenter", () => {
                if (!ring || !cursorLabel) return;
                cursorLabel.textContent = el.dataset.cursor;
                ring.classList.add("labelled");
            });
            el.addEventListener("pointerleave", () => ring && ring.classList.remove("labelled"));
        });

        wake();
    } else {
        dot && dot.remove();
        ring && ring.remove();
    }

    /* ---------------------------------------- Card spotlight and tilt */
    if (finePointer && !reduced) {
        $$(".card").forEach(card => {
            const flat = card.classList.contains("cv-card") || card.classList.contains("contact-card");
            card.addEventListener("pointermove", e => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                card.style.setProperty("--mx", `${px * 100}%`);
                card.style.setProperty("--my", `${py * 100}%`);
                if (flat) return;
                card.style.setProperty("--ry", `${(px - 0.5) * 9}deg`);
                card.style.setProperty("--rx", `${(0.5 - py) * 9}deg`);
            }, { passive: true });

            card.addEventListener("pointerleave", () => {
                card.style.setProperty("--rx", "0deg");
                card.style.setProperty("--ry", "0deg");
            });
        });

        /* ------------------------------------------ Magnetic buttons */
        $$(".magnet").forEach(el => {
            el.addEventListener("pointermove", e => {
                const r = el.getBoundingClientRect();
                el.style.setProperty("--mxp", `${(e.clientX - r.left - r.width / 2) * 0.22}px`);
                el.style.setProperty("--myp", `${(e.clientY - r.top - r.height / 2) * 0.32}px`);
            }, { passive: true });
            el.addEventListener("pointerleave", () => {
                el.style.setProperty("--mxp", "0px");
                el.style.setProperty("--myp", "0px");
            });
        });

        /* -------------------------------------------- Terminal tilt */
        const termWrap = $(".term-wrap");
        const term = $(".term");
        if (termWrap && term) {
            termWrap.addEventListener("pointermove", e => {
                const r = termWrap.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                term.style.setProperty("--try", `${px * 12}deg`);
                term.style.setProperty("--trx", `${-py * 10}deg`);
            }, { passive: true });
            termWrap.addEventListener("pointerleave", () => {
                term.style.setProperty("--trx", "0deg");
                term.style.setProperty("--try", "0deg");
            });
        }
    }

    /* ----------------------------------------------- Hero particles */
    const particles = $("#particles");
    if (particles && !reduced) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < 16; i++) {
            const p = document.createElement("i");
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${60 + Math.random() * 45}%`;
            p.style.animationDuration = `${9 + Math.random() * 11}s`;
            p.style.animationDelay = `${-Math.random() * 14}s`;
            if (Math.random() > 0.6) p.style.background = "var(--acc)";
            frag.append(p);
        }
        particles.append(frag);
    }

    /* ----------------------------------------------------------- Nav */
    const nav = $("#nav");
    const menuBtn = $("#menuBtn");
    const navLinks = $("#navLinks");

    menuBtn.addEventListener("click", () => {
        const open = navLinks.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", String(open));
    });

    navLinks.querySelectorAll("a").forEach(a =>
        a.addEventListener("click", () => {
            navLinks.classList.remove("open");
            menuBtn.setAttribute("aria-expanded", "false");
        })
    );

    document.addEventListener("click", e => {
        if (!nav.contains(e.target)) {
            navLinks.classList.remove("open");
            menuBtn.setAttribute("aria-expanded", "false");
        }
    });

    addEventListener("keydown", e => {
        if (e.key === "Escape") {
            navLinks.classList.remove("open");
            menuBtn.setAttribute("aria-expanded", "false");
        }
    });

    const navAnchors = $$("nav .links a");
    const navLabels = navAnchors.map(a => a.textContent.trim());

    // Duplicate label rolls up on hover; the clone is decorative only.
    navAnchors.forEach((a, i) => {
        a.innerHTML = `<span class="roll"><span>${navLabels[i]}</span><span aria-hidden="true">${navLabels[i]}</span></span>`;
    });

    const rail = document.createElement("aside");
    rail.className = "rail";
    rail.setAttribute("aria-hidden", "true");
    rail.innerHTML = navAnchors
        .map((a, i) => `<a href="${a.getAttribute("href")}" data-label="${navLabels[i]}" tabindex="-1"><i></i></a>`)
        .join("");
    document.body.append(rail);
    const railDots = $$("a", rail);

    function setActiveSection(id) {
        navAnchors.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${id}`));
        railDots.forEach(d => d.classList.toggle("active", d.getAttribute("href") === `#${id}`));
    }

    const sections = navAnchors.map(a => $(a.getAttribute("href"))).filter(Boolean);

    navAnchors
        .map(a => $(a.getAttribute("href")))
        .forEach(s => s && s.setAttribute("data-section", ""));

    /* ------------------------------- Scroll progress, parallax, FAB */
    const bar = $("#scrollBar");
    const fab = $("#fab");
    const fabFill = $("#fabFill");
    const RING = 119.38;
    let ticking = false;

    function onScroll() {
        const y = scrollY;
        const max = document.documentElement.scrollHeight - innerHeight;
        const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        if (bar) bar.style.transform = `scaleX(${progress})`;
        if (fabFill) fabFill.style.strokeDashoffset = `${RING * (1 - progress)}`;
        nav.classList.toggle("scrolled", y > 40);
        if (fab) fab.classList.toggle("show", y > innerHeight * 0.8);
        rail.classList.toggle("show", y > innerHeight * 0.6);
        if (!reduced) document.body.style.setProperty("--grid-y", `${-y * 0.06}px`);

        if (y < innerHeight * 0.5) {
            setActiveSection(null);
        } else if (max - y < 4) {
            // At the page bottom the detection line can never reach the last section.
            setActiveSection(sections[sections.length - 1].id);
        } else {
            const line = y + innerHeight * 0.35;
            let current = null;
            for (const s of sections) if (s.offsetTop <= line) current = s;
            setActiveSection(current && current.id);
        }

        sweepReveals();
        ticking = false;
    }

    addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(onScroll);
    }, { passive: true });
    onScroll();

    /* --------------------------------------------- Copy email + toast */
    const toast = $("#toast");
    let toastTimer;

    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
    }

    const copyBtn = $("#copyEmail");
    copyBtn && copyBtn.addEventListener("click", async () => {
        const value = copyBtn.dataset.copy;
        try {
            await navigator.clipboard.writeText(value);
            copyBtn.textContent = "Copied";
            copyBtn.classList.add("done");
            showToast(`${value} copied to clipboard`);
            setTimeout(() => {
                copyBtn.textContent = "Copy";
                copyBtn.classList.remove("done");
            }, 2000);
        } catch {
            showToast("Copy failed — select the address manually");
        }
    });

    /* ----------------------------------------------------- Live clock */
    const clock = $("#clock");
    if (clock) {
        const fmt = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
        });
        const tickClock = () => {
            clock.textContent = fmt.format(new Date());
            setTimeout(tickClock, 1000 - (Date.now() % 1000));
        };
        tickClock();
    }

    /* ------------------------------------------------- Konami easter */    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let pos = 0;
    addEventListener("keydown", e => {
        pos = e.key.toLowerCase() === seq[pos].toLowerCase() ? pos + 1 : 0;
        if (pos !== seq.length) return;
        pos = 0;
        document.documentElement.style.setProperty("--acc", "#ff7ac6");
        document.documentElement.style.setProperty("--acc2", "#ffd76e");
        showToast("theme override engaged");
        setTimeout(() => {
            document.documentElement.style.removeProperty("--acc");
            document.documentElement.style.removeProperty("--acc2");
        }, 8000);
    });
})();