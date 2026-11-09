const shot = document.getElementById('game-shot');
const curve = document.getElementById('shot-arc');
const pathLength = curve.getTotalLength();
let frame = 0;

function replayShot() {
    cancelAnimationFrame(frame);
    const start = performance.now();
    function draw(now) {
        const fraction = Math.min(1, Math.max(0, (now - start) / 2200));
        const point = curve.getPointAtLength(pathLength * fraction);
        shot.setAttribute('cx', point.x);
        shot.setAttribute('cy', point.y);
        if (fraction < 1) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
}
document.getElementById('game-replay').addEventListener('click', replayShot);
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            replayShot();
            observer.disconnect();
        }
    }, { threshold: .5 });
    observer.observe(document.querySelector('.game-preview'));
}
