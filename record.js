/* =====================================================================
   หน้าเครื่องเล่นแผ่นเสียง
   - ลากแผ่นเสียงออกจากซองไปวางบนเครื่อง → เข็มลง → แผ่นหมุน → เพลงจาก YouTube (ฝังแบบถูกลิขสิทธิ์)
   - เล่นช่วง start → fadeAt เต็มเสียง, แล้วค่อยๆ เบาลงถึง fadeEnd เหลือเสียงคลอเบาๆ ระหว่างอ่าน
   - ถึง readyAt มีปุ่มให้เธอกดเองเมื่อพร้อม แล้วข้อความค่อยขึ้น (ไม่เด้งขึ้นเองทันที)
   - ข้อความขอโทษขึ้นทีละหน้า เขียนทีละคำบนกระดาษเส้น แตะเพื่ออ่านต่อ
   ใช้: Record.init(config, { onDone }), Record.preload(), Record.enter()
   ===================================================================== */
(function () {
    let cfg, opts, player = null, ytReady = false, apiRequested = false, readyResolve = null;
    const readyPromise = new Promise(r => { readyResolve = r; });
    let placed = false, reading = false, pollTimer = null, fallbackTimer = null, page = 0, writing = null, duckTimer = null;
    const $ = (id) => document.getElementById(id);

    // ---------- YouTube ----------
    function loadApi() {
        if (apiRequested) return;
        apiRequested = true;
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev && prev();
            player = new YT.Player('ytPlayer', {
                width: 200, height: 113, videoId: cfg.video,
                playerVars: { start: cfg.start, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, disablekb: 1, fs: 0 },
                events: {
                    onReady: () => { ytReady = true; readyResolve(); },
                    // เพลงจบ → หยุดตัวเล่นไปเลย ไม่มีเสียงอะไรต่อ
                    onStateChange: (e) => { if (e.data === 0) { clearInterval(pollTimer); try { player.stopVideo(); } catch (err) {} } },
                },
            });
        };
    }
    function playSong() {
        if (!player || !ytReady) return false;
        try {
            player.setVolume(100);
            player.seekTo(cfg.start, true);
            player.playVideo();
        } catch (e) { return false; }
        return true;
    }
    const isPlaying = () => player && ytReady && player.getPlayerState && player.getPlayerState() === 1;

    function watchSong() {
        clearInterval(pollTimer);
        pollTimer = setInterval(() => {
            if (!isPlaying()) return;
            $('recTapPlay').classList.remove('is-in');
            const t = player.getCurrentTime();
            if (!reading && opts.onTime && t >= cfg.start - 1) opts.onTime(Math.max(0, t - cfg.start));
            if (t >= cfg.fadeAt && !reading) {   // ตอนอ่านแล้ว duckForReading() คุมเสียงแทน
                // ค่อยๆ เบาลงจาก 100 → quietVolume ระหว่าง fadeAt → fadeEnd แล้วคลอไว้แบบนั้น
                const f = Math.min(1, (t - cfg.fadeAt) / (cfg.fadeEnd - cfg.fadeAt));
                player.setVolume(Math.round(100 - (100 - cfg.quietVolume) * f));
            }
            if (t >= cfg.readyAt && !reading) showReadButton();
        }, 200);
    }

    // ---------- ลากแผ่นเสียง ----------
    function setupDrag() {
        const vinyl = $('vinyl'), stage = $('recordStage');
        const canvas = stage.querySelector('.cg-canvas');
        const k = () => parseFloat(canvas.style.getPropertyValue('--k')) || 1;
        let start = null;
        vinyl.addEventListener('pointerdown', (e) => {
            if (placed) return;
            e.preventDefault();
            vinyl.setPointerCapture(e.pointerId);
            start = { x: e.clientX, y: e.clientY };
            vinyl.classList.add('is-dragging');
            $('recHint').classList.add('is-gone');
            window.Music && Music.sfx('pat');
        });
        vinyl.addEventListener('pointermove', (e) => {
            if (!start) return;
            const dx = (e.clientX - start.x) / k(), dy = (e.clientY - start.y) / k();
            vinyl.style.translate = `${dx}px ${dy}px`;
        });
        const drop = (e) => {
            if (!start) return;
            const dx = (e.clientX - start.x) / k(), dy = (e.clientY - start.y) / k();
            start = null;
            vinyl.classList.remove('is-dragging');
            // ระยะจากจุดกลางแผ่นถึงแกนจานหมุน
            const vx = vinyl.offsetLeft + vinyl.offsetWidth / 2 + dx, vy = vinyl.offsetTop + vinyl.offsetHeight / 2 + dy;
            const p = cfg.spindle;
            if (Math.hypot(vx - p.x, vy - p.y) < 95) placeOnDeck(dx, dy);
            else { vinyl.style.translate = ''; $('recHint').classList.remove('is-gone'); }   // ไม่ถึง → กลับเข้าซอง
        };
        vinyl.addEventListener('pointerup', drop);
        vinyl.addEventListener('pointercancel', drop);
    }

    function placeOnDeck() {
        placed = true;
        const vinyl = $('vinyl'), p = cfg.spindle;
        vinyl.classList.add('is-snapping');
        vinyl.style.translate = `${p.x - (vinyl.offsetLeft + vinyl.offsetWidth / 2)}px ${p.y - (vinyl.offsetTop + vinyl.offsetHeight / 2)}px`;
        window.Music && Music.sfx('drop', 0);
        // สั่งเล่นทันทีตอนนิ้วปล่อย (ยังนับเป็นการแตะของผู้ใช้ มือถือจะยอมให้มีเสียง) แต่ปิดเสียงไว้ก่อนจนเข็มลง
        if (playSong()) { try { player.setVolume(0); } catch (e) {} }
        setTimeout(() => {
            $('deckArm').classList.add('is-down');   // เข็มค่อยๆ ลง
            window.Music && Music.sfx('paper');
        }, 500);
        setTimeout(() => {
            $('recordStage').classList.add('is-playing');
            $('sleeve').classList.add('is-away');
            $('recNow').classList.add('is-in');
            if (player && ytReady) { player.seekTo(cfg.start, true); player.setVolume(100); player.playVideo(); }
            watchSong();
            noteTimer = setInterval(spawnNote, 1100);
            // ถ้าเพลงไม่ยอมเล่น (เน็ตหลุด/เครื่องบล็อก) → ปุ่มแตะเพื่อฟัง, และสุดท้ายไม่ว่ายังไงก็ให้อ่านข้อความได้
            fallbackTimer = setTimeout(() => { if (!isPlaying()) $('recTapPlay').classList.add('is-in'); }, 3500);
            setTimeout(() => { if (!reading && !isPlaying()) showReadButton(); }, 15000);
        }, 1700);
    }
    let noteTimer = null;
    function spawnNote() {
        const stage = $('recordStage');
        if (!stage.classList.contains('is-playing')) return;
        const n = document.createElement('div');
        n.className = 'rec-flynote';
        n.textContent = ['♪', '♫', '♩', '♬'][(Math.random() * 4) | 0];
        n.style.left = (cfg.spindle.x - 40 + Math.random() * 80) + 'px';
        n.style.top = (cfg.spindle.y - 70 - (cfg.liftY || 0)) + 'px';   // เครื่องเล่นยกขึ้นตอนเพลงเล่น
        n.style.setProperty('--dx', (Math.random() * 90 - 45) + 'px');
        stage.querySelector('.cg-canvas').appendChild(n);
        setTimeout(() => n.remove(), 3200);
    }

    // ---------- ปุ่มเปิดอ่าน (เธอกดเองเมื่อพร้อม) ----------
    function showReadButton() {
        const b = $('recRead');
        if (b.classList.contains('is-in')) return;
        b.classList.add('is-in');
        window.Music && Music.sfx('tink');
    }

    // ---------- ข้อความขอโทษ ----------
    function startReading() {
        if (reading) return;
        reading = true;
        $('recordStage').classList.add('is-reading');
        opts.onRead && opts.onRead();
        duckForReading();
        window.Music && Music.sfx('paper');
        setTimeout(() => showPage(0), 2300);   // รอกระดาษเลื่อนขึ้นช้าๆ ก่อน
    }

    // กดอ่านแล้ว: ค่อยๆ ลดเสียงเพลงลงจนเบามากๆ (readVolume) ใน ~2 วิ ไม่ว่าจะกดตอนไหน
    function duckForReading() {
        if (!player || !ytReady) return;
        clearInterval(duckTimer);
        let v; try { v = player.getVolume(); } catch (e) { return; }
        const target = cfg.readVolume, step = Math.max(1, (v - target) / 20);
        duckTimer = setInterval(() => {
            v = Math.max(target, v - step);
            try { player.setVolume(Math.round(v)); } catch (e) {}
            if (v <= target) clearInterval(duckTimer);
        }, 100);
    }

    function segments(text) {
        try {
            const seg = new Intl.Segmenter('th', { granularity: 'word' });
            return [...seg.segment(text)].map(s => s.segment);
        } catch (e) { return [...text]; }
    }

    function showPage(i) {
        page = i;
        const text = $('recText'), next = $('recNext'), pages = cfg.pages.length;
        $('recPage').textContent = `${Math.min(i + 1, pages + 1)}/${pages + 1}`;
        next.classList.remove('is-in');
        if (i >= pages) {   // หน้าสุดท้าย
            text.innerHTML = `<div class="rec-closing">${cfg.closing}</div><div class="rec-from">${cfg.from}</div>` +
                `<div class="rec-heart">${cfg.heart || ''}</div>` +
                `<div style="text-align:center; margin-top:22px;"><span class="cg-cta"><button id="recToFlowers" class="cg-tag">${cfg.button}</button></span></div>`;
            text.querySelectorAll('.rec-closing, .rec-from, .rec-heart, #recToFlowers').forEach((el, j) => {
                el.style.opacity = 0; el.style.transition = 'opacity 1s ease';
                setTimeout(() => { el.style.opacity = 1; }, 300 + j * 700);
            });
            $('recToFlowers').addEventListener('click', finish);
            writing = null;
            return;
        }
        const words = segments(cfg.pages[i]);
        text.innerHTML = '<p class="rec-para">' + words.map(w => `<span class="w">${w.replace(/</g, '&lt;')}</span>`).join('') + '</p>';
        const spans = [...text.querySelectorAll('.w')];
        let j = 0;
        clearInterval(writing);
        writing = setInterval(() => {
            if (j >= spans.length) { clearInterval(writing); writing = null; next.classList.add('is-in'); return; }
            const sp = spans[j++];
            sp.classList.add('in');
            if (sp.textContent.trim() && window.Music) Music.sfx('type');   // เสียงพิมพ์ทีละคำ
        }, cfg.wordMs || 110);
    }

    // แตะกระดาษ: เสียงกระดาษเบาๆ + กระดาษขยับนิดนึงทุกครั้ง
    function tapFx() {
        const paper = $('recPaper');
        paper.classList.remove('is-tap'); void paper.offsetWidth; paper.classList.add('is-tap');
        window.Music && Music.sfx('tap');
    }

    function onPaperTap() {
        if (!reading || page > cfg.pages.length - 1 + 1) return;
        tapFx();
        if (writing) {   // กำลังเขียนอยู่ → แตะ = ให้ขึ้นครบทั้งย่อหน้าเลย
            clearInterval(writing); writing = null;
            $('recText').querySelectorAll('.w').forEach(s => s.classList.add('in'));
            $('recNext').classList.add('is-in');
            return;
        }
        if (page >= cfg.pages.length) return;
        const paper = $('recPaper');
        paper.classList.add('is-turning');
        window.Music && Music.sfx('paper');
        setTimeout(() => { showPage(page + 1); paper.classList.remove('is-turning'); }, 420);
    }

    function finish() {
        clearInterval(pollTimer); clearInterval(noteTimer); clearTimeout(fallbackTimer); clearInterval(duckTimer);
        // ค่อยๆ เฟดเพลงออก แล้วไปหน้าดอกไม้
        if (isPlaying()) {
            let v = player.getVolume();
            const fade = setInterval(() => {
                v -= 4;
                if (v <= 0) { clearInterval(fade); try { player.pauseVideo(); } catch (e) {} return; }
                player.setVolume(v);
            }, 60);
        }
        $('recordStage').classList.remove('is-playing');
        opts.onDone && opts.onDone();
    }

    function init(config, options) {
        cfg = config; opts = options || {};
        setupDrag();
        $('recPaper').addEventListener('click', (e) => { if (!e.target.closest('button')) onPaperTap(); });
        $('recTapPlay').addEventListener('click', () => { playSong(); });
        $('recRead').addEventListener('click', () => { $('recRead').classList.remove('is-in'); startReading(); });
    }

    function preload() {
        loadApi();
        return Promise.race([readyPromise, new Promise(r => setTimeout(r, 15000))]);
    }
    function enter() { loadApi(); }

    window.Record = { init, preload, enter };
})();
