/* =====================================================================
   Collage motion
   - fit():  ย่อ/ขยายผืน 375x812 ให้พอดีพื้นที่ที่มองเห็นจริงของทุกเบราว์เซอร์ (visualViewport + safe area)
   - place(): แปะชิ้นส่วนลงทีละชิ้นตามลำดับ data-o
   - panTo(): ตอนพิมพ์รหัส เลื่อนทั้งหน้าขึ้นให้ตั๋วพ้นคีย์บอร์ด
   ===================================================================== */
(function () {
    const W = 375, H = 812;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- พื้นที่ที่มองเห็นจริง (ทุกเบราว์เซอร์มือถือ แถบบน-ล่างสูงไม่เท่ากัน) ----------
       ใช้ visualViewport (ความสูงจริงหลังหักแถบเบราว์เซอร์) แล้วตั้ง --app-h ให้ฉากทุกฉาก
       หักขอบกล้อง/ขอบโค้งด้วย env(safe-area-inset-*) แล้วย่อผืน 375x812 ให้พอดีทั้งผืน ไม่ล้นจอ */
    const root = document.documentElement;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
    (document.body || root).appendChild(probe);
    function insets() {
        const cs = getComputedStyle(probe);
        return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    }
    function visibleHeight() {
        const vv = window.visualViewport;
        // ไม่ใช้ค่าตอนผู้ใช้ซูมนิ้ว (scale > 1) — ใช้ความสูงหน้าต่างแทน
        return vv && vv.scale <= 1.01 ? vv.height : window.innerHeight;
    }

    const fitted = new Set();
    function applyFit(stage) {
        const canvas = stage.querySelector('.cg-canvas');
        if (!canvas) return;
        const sw = stage.clientWidth, sh = stage.clientHeight;
        if (!sw || !sh) return;
        const ins = insets();
        const aw = Math.max(1, sw - ins.l - ins.r), ah = Math.max(1, sh - ins.t - ins.b);
        // พอดีทั้งความกว้างและความสูง: ทุกอย่างบนผืนอยู่ในจอเสมอ ไม่โดนแถบบัง
        const k = Math.min(aw / W, ah / H);
        canvas.style.setProperty('--k', k);
        canvas.style.setProperty('--x', (ins.l + (aw - W * k) / 2) + 'px');
        canvas.style.setProperty('--y', (ins.t + (ah - H * k) / 2) + 'px');
    }
    let queued = false;
    function refit() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            root.style.setProperty('--app-h', visibleHeight() + 'px');
            fitted.forEach(applyFit);
        });
    }
    root.style.setProperty('--app-h', visibleHeight() + 'px');
    if (window.visualViewport) visualViewport.addEventListener('resize', refit);
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', () => { refit(); setTimeout(refit, 350); setTimeout(refit, 900); });   // บางเครื่องแจ้งขนาดใหม่ช้า
    document.addEventListener('fullscreenchange', () => { refit(); setTimeout(refit, 350); });

    function fit(stage) {
        fitted.add(stage);
        root.style.setProperty('--app-h', visibleHeight() + 'px');
        applyFit(stage);
    }

    function place(stage, delay = 450) {
        const pieces = [...stage.querySelectorAll('.cg-piece')]
            .sort((a, b) => (+a.dataset.o || 0) - (+b.dataset.o || 0));
        if (reduceMotion) return;
        pieces.forEach(p => { p.style.transitionDelay = '0s'; p.classList.add('is-off'); });
        void stage.offsetWidth;
        setTimeout(() => {
            pieces.forEach((p, i) => {
                p.style.transitionDelay = (i * 0.17) + 's';
                p.classList.remove('is-off');
                if (window.Music && i % 2 === 0) setTimeout(() => Music.sfx('pat'), i * 170 + 250);   // เสียงกระดาษแปะ
            });
        }, delay);
    }

    /* เลื่อนผืนให้ element อยู่ที่ระยะ topPx จากบนจอ (0 = กลับที่เดิม) */
    function panTo(stage, el, topPx = 110) {
        const canvas = stage.querySelector('.cg-canvas');
        if (!el) { canvas.style.setProperty('--pan', '0px'); return; }
        const current = parseFloat(canvas.style.getPropertyValue('--pan')) || 0;
        const rect = el.getBoundingClientRect();
        const shift = Math.min(0, current - (rect.top - topPx));
        canvas.style.setProperty('--pan', shift + 'px');
    }

    /* รูปที่ยังไม่มีไฟล์ → โชว์ลายมือ "รูปเรา" แทน */
    function photos(stage) {
        stage.querySelectorAll('.cg-photo img').forEach(img => {
            const mark = () => img.parentElement.classList.add('is-missing');
            if (img.complete && img.naturalWidth === 0) mark();
            img.addEventListener('error', mark);
        });
    }

    /* ขอบกระดาษฉีก: สุ่มรอยหยักรอบขอบ element ที่มี class cg-tear ทุกชิ้นไม่ซ้ำกัน */
    function tear(root) {
        root.querySelectorAll('.cg-tear').forEach(el => {
            const w = el.offsetWidth, h = el.offsetHeight;
            if (!w || !h) return;
            const amp = parseFloat(el.dataset.tear || 5);      // ความลึกรอยฉีก (px)
            const pts = [];
            const jag = () => Math.random() * amp;
            const step = () => 5 + Math.random() * 7;
            for (let x = 0; x < w; x += step()) pts.push([x, jag()]);
            for (let y = 0; y < h; y += step()) pts.push([w - jag(), y]);
            for (let x = w; x > 0; x -= step()) pts.push([x, h - jag()]);
            for (let y = h; y > 0; y -= step()) pts.push([jag(), y]);
            el.style.clipPath = 'polygon(' + pts.map(([x, y]) =>
                `${(x / w * 100).toFixed(2)}% ${(y / h * 100).toFixed(2)}%`).join(',') + ')';
        });
    }

    /* เศษกระดาษสีร่วงลงมา */
    function confetti(stage, colors, count = 46) {
        if (reduceMotion) return;
        for (let i = 0; i < count; i++) {
            const c = document.createElement('div');
            c.className = 'cg-confetti';
            const w = 6 + Math.random() * 9, h = w * (0.5 + Math.random());
            c.style.cssText = `left:${Math.random() * 100}%; width:${w}px; height:${h}px;` +
                `background:${colors[i % colors.length]}; border-radius:${Math.random() < .3 ? '50%' : '1px'};` +
                `--dx:${(Math.random() * 120 - 60).toFixed(0)}px; --rot:${(Math.random() * 720 - 360).toFixed(0)}deg;` +
                `animation-duration:${(3.2 + Math.random() * 2.4).toFixed(2)}s; animation-delay:${(Math.random() * 0.8).toFixed(2)}s;`;
            stage.appendChild(c);
            setTimeout(() => c.remove(), 7000);
        }
    }

    function show(stage) {
        fit(stage);
        photos(stage);
        tear(stage);
        place(stage);
    }

    window.Collage = { fit, refit, place, panTo, photos, tear, confetti, show };
})();
