/* =====================================================================
   Scrapbook / collage motion
   - วาดสติกเกอร์ (SVG) จาก data-* ใน HTML
   - ตอนเปิดหน้า: สติกเกอร์ค่อยๆ กระจายออกจากหลังการ์ด
   - ลอยเบาๆ ตลอด (CSS) และ parallax ตอนเลื่อนจอ
   ใช้:  <span class="sb-sticker" data-kind="heart" data-x="12" data-y="9"
               data-size="44" data-rotate="-12" data-color="#E7B4A0" data-depth="1.4"></span>
         Scrapbook.init(pageElement)
   เปลี่ยนเป็นรูป PNG ได้ด้วย data-src="picture/sticker-heart.png"
   ===================================================================== */
(function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const SHAPES = {
        heart: (c) => `<svg viewBox="0 0 34 30"><path d="M17 28C3 18 0 10 5 5C9 1 15 3 17 8C19 3 25 1 29 5C34 10 31 18 17 28Z" fill="${c}" stroke="rgba(60,40,30,.12)"/><ellipse cx="10" cy="9" rx="3.4" ry="2" fill="#fff" opacity=".7" transform="rotate(-30 10 9)"/></svg>`,
        star: (c) => `<svg viewBox="0 0 30 30"><path d="M15 2L18.5 11L28 11.5L20.5 17.5L23 27L15 21.5L7 27L9.5 17.5L2 11.5L11.5 11Z" fill="${c}" stroke="rgba(60,40,30,.12)" stroke-linejoin="round"/><ellipse cx="12" cy="11" rx="2.2" ry="1.3" fill="#fff" opacity=".7"/></svg>`,
        button: (c) => `<svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="12.5" fill="${c}" stroke="rgba(60,40,30,.12)"/><circle cx="14" cy="14" r="9" fill="none" stroke="#fff" stroke-opacity=".45"/><circle cx="11" cy="11" r="1.7" fill="#fff"/><circle cx="17" cy="11" r="1.7" fill="#fff"/><circle cx="11" cy="17" r="1.7" fill="#fff"/><circle cx="17" cy="17" r="1.7" fill="#fff"/></svg>`,
        bow: (c) => `<svg viewBox="0 0 46 30"><path d="M23 13C14 2 4 4 5 12C6 20 15 20 23 13C31 20 40 20 41 12C42 4 32 2 23 13Z" fill="${c}" fill-opacity=".35" stroke="${c}" stroke-width="2"/><path d="M21 14L14 28M25 14L32 28" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><circle cx="23" cy="13" r="3.2" fill="${c}"/></svg>`,
        flower: (c) => `<svg viewBox="0 0 30 30"><g fill="${c}" stroke="rgba(60,40,30,.1)"><circle cx="15" cy="7.5" r="6"/><circle cx="22.5" cy="13" r="6"/><circle cx="19.5" cy="22" r="6"/><circle cx="10.5" cy="22" r="6"/><circle cx="7.5" cy="13" r="6"/></g><circle cx="15" cy="15" r="4.2" fill="#F3D27A"/></svg>`,
        sparkle: (c) => `<svg viewBox="0 0 20 20"><path d="M10 0L11.4 8.6L20 10L11.4 11.4L10 20L8.6 11.4L0 10L8.6 8.6Z" fill="${c}"/></svg>`,
    };

    function build(root) {
        root.querySelectorAll('.sb-sticker').forEach((el, i) => {
            if (el.dataset.built) return;
            const d = el.dataset;
            el.style.left = (d.x || 50) + '%';
            el.style.top = (d.y || 50) + '%';
            el.style.setProperty('--s', (d.size || 40) + 'px');
            el.style.setProperty('--r', (d.rotate || 0) + 'deg');
            el.style.setProperty('--fd', (4 + (i % 4) * 0.7) + 's');
            el.style.setProperty('--fdl', (-i * 0.6) + 's');
            const art = d.src
                ? `<img src="${d.src}" alt="" style="width:100%;height:100%;object-fit:contain">`
                : (SHAPES[d.kind] || SHAPES.heart)(d.color || 'var(--accent-color)');
            el.innerHTML = `<span class="sb-float">${art}</span>`;
            el.dataset.built = '1';
        });
    }

    /* สติกเกอร์เริ่มกองอยู่ที่จุดศูนย์กลางของ [data-sb-origin] แล้วกระจายออก */
    function scatter(root) {
        const stickers = [...root.querySelectorAll('.sb-sticker')];
        if (reduceMotion || !stickers.length) return;
        const origin = root.querySelector('[data-sb-origin]') || root;
        const o = origin.getBoundingClientRect();
        const ox = o.left + o.width / 2;
        const oy = o.top + o.height / 2;

        stickers.forEach((el) => {
            el.style.transitionDelay = '0s';
            el.classList.remove('is-gathered');
            const r = el.getBoundingClientRect();
            el.style.setProperty('--dx', (ox - (r.left + r.width / 2)) + 'px');
            el.style.setProperty('--dy', (oy - (r.top + r.height / 2)) + 'px');
            el.classList.add('is-gathered');
        });
        void root.offsetWidth; // ให้เบราว์เซอร์วาดตำแหน่งเริ่มต้นก่อน
        setTimeout(() => {
            stickers.forEach((el, i) => {
                el.style.transitionDelay = (i * 0.07) + 's';
                el.classList.remove('is-gathered');
            });
        }, 350);
    }

    /* Parallax: ชิ้นที่ data-depth มากจะเลื่อนเร็วกว่า */
    function parallax(root, scroller) {
        const stickers = [...root.querySelectorAll('.sb-sticker[data-depth]')];
        if (reduceMotion || !stickers.length) return;
        const target = scroller || window;
        let ticking = false;
        const update = () => {
            const y = scroller ? scroller.scrollTop : window.scrollY;
            stickers.forEach((el) => {
                const depth = parseFloat(el.dataset.depth) || 1;
                el.style.setProperty('--py', (-y * (depth - 1) * 0.35) + 'px');
            });
            ticking = false;
        };
        target.addEventListener('scroll', () => {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
    }

    function init(root, opts = {}) {
        build(root);
        scatter(root);
        if (opts.scroller !== undefined) parallax(root, opts.scroller);
    }

    window.Scrapbook = { init, build, scatter, parallax };
})();
