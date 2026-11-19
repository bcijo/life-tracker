/**
 * Keeps a CSS variable `--app-vh` equal to 1% of the *visible* viewport height.
 *
 * `vh` on phones is measured with the browser toolbars hidden, so a 90vh pop-up
 * is taller than the screen whenever the toolbars (or the keyboard) are showing,
 * and its top and bottom end up off-screen. `visualViewport` reports the area
 * the user can actually see, so sizes based on `--app-vh` always fit.
 *
 * Use as: calc(var(--app-vh, 1vh) * 90)
 */
export function installViewportHeightVar() {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const vv = window.visualViewport;
    let frame = 0;

    const update = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            const height = vv ? vv.height : window.innerHeight;
            root.style.setProperty('--app-vh', `${height / 100}px`);
            // How far the visible area is scrolled down (iOS moves it when the keyboard opens)
            root.style.setProperty('--app-vv-top', `${vv ? vv.offsetTop : 0}px`);
        });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    if (vv) {
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
    }
}
