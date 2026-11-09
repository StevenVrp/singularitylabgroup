const thumbnails = [...document.querySelectorAll('.activity-thumb')];
const strip = document.querySelector('.activity-strip');
let current = 0;

function showActivity(index) {
    current = (index + thumbnails.length) % thumbnails.length;
    const active = thumbnails[current];
    for (const link of thumbnails) link.removeAttribute('aria-current');
    active.setAttribute('aria-current', 'true');
    const photo = document.getElementById('activity-photo');
    photo.src = active.href;
    photo.alt = active.dataset.alt;
    document.getElementById('activity-full').href = active.href;
    document.getElementById('activity-caption').textContent = active.dataset.caption;
    document.getElementById('activity-count').textContent =
        String(current + 1).padStart(2, '0') + ' / ' + thumbnails.length;
    strip.scrollLeft += active.getBoundingClientRect().left - strip.getBoundingClientRect().left
        - (strip.clientWidth - active.offsetWidth) / 2;
}

thumbnails[0].setAttribute('aria-current', 'true');
thumbnails.forEach((link, index) => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    showActivity(index);
}));
document.getElementById('activity-prev').addEventListener('click', () => showActivity(current - 1));
document.getElementById('activity-next').addEventListener('click', () => showActivity(current + 1));

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
