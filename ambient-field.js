/* Experimental contour field. Time-based movement follows native refresh rate. */
window.createAmbientField = function (canvas) {
    const ctx = canvas.getContext('2d');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: 0, y: 0 }, current = { x: 0, y: 0 };
    let width = 0, height = 0, time = 0, previous = null, frame;

    let themeMix = document.documentElement.classList.contains('dark-mode') ? 1 : 0;
    let themeTarget = themeMix, themeOrigin = themeMix, themeStarted = 0;
    const mix = (light, dark) => light + (dark - light) * themeMix;

    function resize() {
        width = innerWidth;
        height = innerHeight;
        const ratio = Math.min(devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        repaint();
    }
    function draw(timestamp = performance.now(), advance = true) {
        const delta = previous === null ? 0 : Math.min((timestamp - previous) / 1000, 0.05);
        previous = timestamp;
        if (advance && !reducedMotion.matches) time += delta * (scrollY > height * 0.5 ? 0.45 : 1);
        const target = document.documentElement.classList.contains('dark-mode') ? 1 : 0;
        if (target !== themeTarget) {
            themeOrigin = themeMix;
            themeTarget = target;
            themeStarted = timestamp;
        }
        const progress = Math.min(Math.max((timestamp - themeStarted) / 450, 0), 1);
        const eased = progress * progress * (3 - 2 * progress);
        themeMix = reducedMotion.matches ? target : themeOrigin + (themeTarget - themeOrigin) * eased;
        current.x += (pointer.x - current.x) * (1 - Math.exp(-delta * 2));
        current.y += (pointer.y - current.y) * (1 - Math.exp(-delta * 2));
        ctx.clearRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(width * 0.75, height * (0.44 + Math.sin(time * 0.08) * 0.015), 0, width * 0.75, height * (0.44 + Math.sin(time * 0.08) * 0.015), width * 0.7);
        glow.addColorStop(0, `rgba(${mix(111,42)},${mix(166,104)},${mix(175,155)},${mix(.09,.16)})`);
        glow.addColorStop(1, 'rgba(42, 104, 155, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // Projected contours form a single broad, breathing field rather than tubes.
        const count = width < 760 ? 28 : 40;
        const bandHeight = Math.min(height * 0.58, 540);
        for (let row = 0; row < count; row++) {
            const v = row / (count - 1);
            const center = height * 0.62 + (v - 0.5) * bandHeight;
            const points = row % 10 === 0 ? [] : null;
            ctx.beginPath();
            for (let step = 0; step <= 100; step++) {
                const u = step / 100;
                const x = u * (width + 80) - 40;
                const envelope = Math.pow(Math.sin(u * Math.PI), 1.4);
                const swell = Math.sin(u * Math.PI * 2.1 - time * 0.11 + v * 2.3);
                const fold = Math.sin(u * Math.PI * 3.6 + time * 0.065 - v * 2.0);
                const y = center + envelope * (swell * height * 0.12 + fold * height * 0.035)
                    + current.x * (u - 0.5) * 32 + current.y * envelope * 12;
                if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                if (points) points.push({ x, y });
            }
            const focus = Math.sin(v * Math.PI);
            const alpha = mix(0.055,0.08) + focus * mix(0.09,0.18);
            const color = `${mix(61,131)}, ${mix(102,190)}, ${mix(110,203)}`;
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, `rgba(${color},0)`);
            gradient.addColorStop(0.27, `rgba(${color},${alpha * 0.45})`);
            gradient.addColorStop(0.7, `rgba(${color},${alpha})`);
            gradient.addColorStop(1, `rgba(${color},${alpha * 0.15})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = row % 10 === 0 ? 1.3 : 0.65;
            ctx.stroke();
            if (row % 10 === 0) {
                // A restrained travelling sheen follows the contour, never the text.
                const position = 0.5 + Math.sin(time * 0.16 + row * 0.31) * 0.28;
                const first = Math.max(0, Math.floor((position - 0.05) * 100));
                const last = Math.min(100, first + 10);
                const sheen = ctx.createLinearGradient(points[first].x, 0, points[last].x, 0);
                sheen.addColorStop(0, `rgba(${color},0)`);
                sheen.addColorStop(0.5, `rgba(${color},${mix(0.2,0.35)})`);
                sheen.addColorStop(1, `rgba(${color},0)`);
                ctx.beginPath();
                for (let step = first; step <= last; step++) {
                    const point = points[step];
                    if (step === first) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
                }
                ctx.strokeStyle = sheen;
                ctx.lineWidth = 1.3;
                ctx.stroke();
            }
        }
    }
    function animate(timestamp) {
        if (document.hidden) return;
        draw(timestamp);
        if (!reducedMotion.matches) frame = requestAnimationFrame(animate);
    }
    function repaint() {
        cancelAnimationFrame(frame);
        previous = null;
        draw(performance.now(), false);
        if (!document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(animate);
    }
    addEventListener('resize', resize);
    addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
        pointer.x = event.clientX / Math.max(width, 1) * 2 - 1;
        pointer.y = event.clientY / Math.max(height, 1) * 2 - 1;
    }, { passive: true });
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) pointer.x = pointer.y = current.x = current.y = 0;
        repaint();
    });
    document.addEventListener('visibilitychange', repaint);
    resize();
    return { repaint };
};
