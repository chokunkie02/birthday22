/* =====================================================================
   โตมาด้วยกัน — เราสองคนเดินรอบโลกใบเล็กตามเข็มนาฬิกา (ใต้เครื่องเล่นแผ่นเสียง)
   - เดินตามเวลาเพลงจริง (record.js ส่งเวลาที่เล่นไปแล้วมาให้ทุก ~200ms)
   - ทุกรอบเดินจากซ้ายสุด ข้ามยอดโลก ลงไปขวาสุด → วาป แล้วโผล่ซ้ายสุดในช่วงวัยถัดไป
   - ระหว่างเดิน ป้ายเวลาไหลไปเรื่อยๆ อ.1 → ป.1-6 → ม.1-6 → ปี 1-3
   - รอบสุดท้ายเดินมาหยุดกลางโลก แล้วหันหน้ามาหากล้อง
   - ฉากทั้งหมดวาดเป็นกระดาษตัดแปะ (SVG) ขอบขาวแบบสติกเกอร์
   ใช้: GrowUp.init(config), GrowUp.preload(), GrowUp.time(sec), GrowUp.end()
   ===================================================================== */
(function () {
    // ---------- ขนาด/ตำแหน่ง (px ในกล่อง .gu — ต้องตรงกับ CSS .gu-world) ----------
    const CX = 187, CY = 480, R = 150;   // จุดกลางโลก + รัศมี
    const ARC = 62;                       // เดินจาก -ARC ถึง +ARC องศา (วัดจากยอดโลก)
    const GAP = 28;                       // เธอเดินนำหน้าเขากี่องศา
    const PROP_ANGLE = 44;                // ของประกอบฉากอยู่ห่างจากยอดโลกกี่องศา

    let cfg, root, him, her, cap, capYear, capPlace, world, props, sky, skyDeco;
    let lap = -1, label = '', faced = false, heartTimer = null, raf = null;
    let songSec = 0, songAt = 0, faceAt = 44;
    const $ = (id) => document.getElementById(id);

    // =====================================================================
    // ของประกอบฉาก (SVG กระดาษตัด) — vb = viewBox, w = ความกว้างที่แสดง
    // =====================================================================
    const CUT = 'filter="url(#gucut)"';
    const sun = `<g ${CUT}><g stroke="#E9B872" stroke-width="4" stroke-linecap="round"><path d="M30 3v8M30 49v8M3 30h8M49 30h8M11 11l6 6M43 43l6 6M11 49l6-6M43 17l6-6"/></g><circle cx="30" cy="30" r="13" fill="#F2C987"/></g>`;
    const cloud = `<g ${CUT}><path d="M14 34C2 34 2 20 14 20C14 8 32 6 36 16C40 6 60 6 60 20C74 18 76 34 64 34Z" fill="#FFFFFF" stroke="#E2D2BE" stroke-width="2"/></g>`;
    const bird = `<path d="M2 8Q8 1 15 8Q22 1 28 8" stroke="#8B5E3C" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    const moon = `<g ${CUT}><path d="M36 5A25 25 0 1 0 55 44A21 21 0 1 1 36 5Z" fill="#F3E3B5"/></g>`;
    const star = `<path d="M10 1L12.5 7.5L19 8L14 12.5L15.5 19L10 15.5L4.5 19L6 12.5L1 8L7.5 7.5Z" fill="#F3E3B5"/>`;
    const thaiFlag = `<g class="gu-flag"><rect width="40" height="5" fill="#C8434B"/><rect y="5" width="40" height="5" fill="#FFFFFF"/><rect y="10" width="40" height="10" fill="#2D3E73"/><rect y="20" width="40" height="5" fill="#FFFFFF"/><rect y="25" width="40" height="5" fill="#C8434B"/></g>`;

    const P = {
        slide: { vb: [110, 100], w: 112, svg: `<g ${CUT}><g fill="none" stroke-linecap="round"><path d="M18 22V100M34 22V100" stroke="#B98557" stroke-width="5"/><path d="M18 40H34M18 58H34M18 76H34M18 94H34" stroke="#B98557" stroke-width="4"/></g><path d="M12 17H48L50 24H12Z" fill="#8B5E3C"/><path d="M44 20C70 22 76 60 106 92L100 100C70 70 64 34 42 30Z" fill="#F2A7B5"/></g><path d="M48 25C69 29 73 62 101 93" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".75"/>` },
        blocks: { vb: [90, 82], w: 92, svg: `<g ${CUT}><rect x="4" y="44" width="38" height="38" rx="4" fill="#F6CAD6"/><rect x="46" y="44" width="38" height="38" rx="4" fill="#C9D8BE"/><g transform="rotate(-7 44 24)"><rect x="25" y="5" width="38" height="38" rx="4" fill="#F2C987"/><text x="44" y="33" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="25" fill="#6B4A32">C</text></g></g><text x="23" y="72" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="25" fill="#7A3B4A">A</text><text x="65" y="72" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="25" fill="#2F4A2A">B</text>` },
        school: { vb: [130, 110], w: 120, svg: `<g ${CUT}><path d="M6 42L65 8L124 42Z" fill="#B5564B"/><rect x="14" y="40" width="102" height="70" fill="#F3E7D3"/></g><g fill="#A9C4C9"><rect x="22" y="52" width="16" height="14" rx="2"/><rect x="44" y="52" width="16" height="14" rx="2"/><rect x="70" y="52" width="16" height="14" rx="2"/><rect x="92" y="52" width="16" height="14" rx="2"/><rect x="22" y="80" width="16" height="14" rx="2"/><rect x="92" y="80" width="16" height="14" rx="2"/></g><rect x="52" y="76" width="26" height="34" rx="2" fill="#8B5E3C"/><circle cx="65" cy="29" r="7" fill="#FFFDF8" stroke="#8B5E3C" stroke-width="2"/><path d="M65 25v4h3" stroke="#8B5E3C" stroke-width="1.6" fill="none"/>` },
        flagpole: { vb: [60, 130], w: 56, svg: `<g ${CUT}><path d="M10 6V130" stroke="#8B7B6B" stroke-width="3.5" stroke-linecap="round"/><circle cx="10" cy="5" r="4" fill="#E9B872"/><g transform="translate(12 10)">${thaiFlag}</g></g>` },
        gate: { vb: [150, 100], w: 128, svg: `<g ${CUT}><rect x="8" y="22" width="18" height="78" fill="#E7D3BD"/><rect x="124" y="22" width="18" height="78" fill="#E7D3BD"/><rect x="4" y="15" width="26" height="9" fill="#B98557"/><rect x="120" y="15" width="26" height="9" fill="#B98557"/><rect x="22" y="26" width="106" height="22" rx="3" fill="#2F5D50"/></g><text x="75" y="41.5" text-anchor="middle" font-family="Mali,Kanit,sans-serif" font-size="11.5" fill="#FFFDF8">ทุ่งใหญ่วิทยาคม</text><g stroke="#8B7B6B" stroke-width="2.5"><path d="M34 60V100M46 60V100M58 60V100M92 60V100M104 60V100M116 60V100M30 62H62M88 62H120"/></g>` },
        bike: { vb: [100, 66], w: 98, svg: `<g ${CUT}><g fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="22" cy="46" r="17" stroke="#4A3D38" stroke-width="4.5"/><circle cx="78" cy="46" r="17" stroke="#4A3D38" stroke-width="4.5"/><path d="M22 46L40 22H70L78 46M40 22L50 46L70 22M50 46H22" stroke="#B5564B" stroke-width="4.5"/><path d="M34 15H48M66 12H76M70 12L70 22" stroke="#4A3D38" stroke-width="4"/></g><rect x="74" y="14" width="20" height="13" rx="2" fill="#D2AE88"/></g>` },
        goal: { vb: [120, 82], w: 120, svg: `<g ${CUT}><path d="M8 80V9H112V80" stroke="#8B7B6B" stroke-width="9" fill="none" stroke-linejoin="round"/><path d="M8 80V9H112V80" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linejoin="round"/></g><g stroke="#BFB3A5" stroke-width="1.2"><path d="M12 24H108M12 40H108M12 56H108M12 72H108M28 12V80M46 12V80M64 12V80M82 12V80M98 12V80"/></g>` },
        ball: { vb: [64, 50], w: 68, svg: `<g ${CUT}><path d="M42 12L54 46H30Z" fill="#E98A4E"/><rect x="26" y="44" width="34" height="6" rx="2" fill="#E98A4E"/><g class="gu-bounce"><circle cx="16" cy="34" r="14" fill="#FFFFFF" stroke="#3A2E2A" stroke-width="2"/><path d="M16 28L21 31.5L19 37H13L11 31.5Z" fill="#3A2E2A"/></g></g><path d="M36 28H48" stroke="#FFFFFF" stroke-width="4"/>` },
        books: { vb: [110, 84], w: 100, svg: `<g ${CUT}><path d="M55 30C42 18 24 16 8 20V30C24 26 42 28 55 38Z" fill="#FFFDF8" stroke="#D8C3A8" stroke-width="1.5"/><path d="M55 30C68 18 86 16 102 20V30C86 26 68 28 55 38Z" fill="#FFFDF8" stroke="#D8C3A8" stroke-width="1.5"/><rect x="10" y="38" width="90" height="13" rx="2" fill="#9DB089"/><rect x="16" y="51" width="82" height="13" rx="2" fill="#2D3E73"/><rect x="8" y="64" width="94" height="16" rx="2" fill="#B5564B"/></g><path d="M16 25C28 22 40 24 50 30M60 30C70 24 82 22 94 25" stroke="#C9B49B" stroke-width="1.2" fill="none"/><path d="M95 41V48M93 54V61M97 67V77" stroke="#FFFDF8" stroke-width="3"/><path d="M20 44H40M26 57H44M18 71H46" stroke="#FFFDF8" stroke-width="2" opacity=".7"/>` },
        podium: { vb: [96, 116], w: 74, svg: `<g ${CUT}><path d="M60 40L66 16" stroke="#4A3D38" stroke-width="3" stroke-linecap="round"/><ellipse cx="67" cy="12" rx="5" ry="7" fill="#4A3D38"/><path d="M10 40H86L80 52H16Z" fill="#8B5E3C"/><path d="M20 52H76L70 116H26Z" fill="#B98557"/><rect x="27" y="62" width="42" height="26" rx="3" fill="#FFFDF8"/></g><text x="48" y="73" text-anchor="middle" font-family="Mali,Kanit,sans-serif" font-size="8" fill="#6B4A32">สภา</text><text x="48" y="84" text-anchor="middle" font-family="Mali,Kanit,sans-serif" font-size="8" fill="#6B4A32">นักเรียน</text><path d="M44 96L48 92L52 96L48 104Z" fill="#E9B872"/>` },
        tent: { vb: [110, 80], w: 112, svg: `<g ${CUT}><path d="M55 8L104 80H6Z" fill="#6E7B4F"/><path d="M55 8L70 80H40Z" fill="#4E5A36"/><path d="M55 8V0" stroke="#6B4A32" stroke-width="3"/><path d="M55 0L66 4L55 8Z" fill="#C8434B"/></g>` },
        fire: { vb: [70, 60], w: 72, svg: `<g ${CUT}><path d="M6 56L64 44M6 44L64 56" stroke="#8B5E3C" stroke-width="7" stroke-linecap="round"/><g class="gu-flicker"><path d="M35 4C46 18 52 28 46 40C42 48 28 48 24 40C19 30 28 24 30 14C33 20 34 24 37 26C40 20 38 12 35 4Z" fill="#E98A4E"/><path d="M35 22C40 30 42 36 38 41C36 44 32 44 30 41C28 36 32 32 35 22Z" fill="#F2C987"/></g></g>` },
        monitor: { vb: [110, 96], w: 108, svg: `<g ${CUT}><rect x="6" y="6" width="98" height="66" rx="7" fill="#4A3D38"/><path d="M48 72H62L66 86H44Z" fill="#6B5A50"/><rect x="28" y="86" width="54" height="8" rx="3" fill="#6B5A50"/></g><rect x="13" y="13" width="84" height="52" rx="3" fill="#24302F"/><g stroke="#9FC4D6" stroke-width="1.4" opacity=".85"><path d="M24 24L40 36L24 48M24 24L40 48L24 48M40 36L24 36M40 36L56 30M40 48L56 30M40 36L56 42M40 48L56 42"/></g><g fill="#F2C987"><circle cx="24" cy="24" r="3"/><circle cx="24" cy="36" r="3"/><circle cx="24" cy="48" r="3"/></g><g fill="#F6CAD6"><circle cx="40" cy="36" r="3"/><circle cx="40" cy="48" r="3"/></g><g fill="#9FD3A8"><circle cx="56" cy="30" r="3"/><circle cx="56" cy="42" r="3"/></g><text x="78" y="45" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="19" fill="#9FD3A8">AI</text><rect class="gu-blink" x="72" y="52" width="6" height="9" fill="#9FD3A8"/>` },
        hospital: { vb: [104, 104], w: 104, svg: `<g ${CUT}><rect x="8" y="22" width="88" height="82" fill="#FFFDF8" stroke="#D8C3A8" stroke-width="2"/><rect x="30" y="4" width="44" height="22" rx="3" fill="#FFFDF8" stroke="#D8C3A8" stroke-width="2"/></g><path d="M47 8H57V12H61V20H57V24H47V20H43V12H47Z" fill="#D9545E" transform="translate(0 -1)"/><g fill="#A9C4C9"><rect x="18" y="34" width="16" height="14" rx="2"/><rect x="44" y="34" width="16" height="14" rx="2"/><rect x="70" y="34" width="16" height="14" rx="2"/><rect x="18" y="58" width="16" height="14" rx="2"/><rect x="70" y="58" width="16" height="14" rx="2"/></g><rect x="40" y="78" width="24" height="26" rx="2" fill="#8B5E3C"/><rect x="44" y="58" width="16" height="14" rx="2" fill="#F6CAD6"/>` },
        desk: { vb: [120, 92], w: 116, svg: `<g ${CUT}><rect x="6" y="56" width="108" height="8" rx="2" fill="#8B5E3C"/><path d="M14 64V92M106 64V92" stroke="#8B5E3C" stroke-width="6"/><path d="M28 56L36 30H82L90 56Z" fill="#4A3D38"/><path d="M100 56V18L84 10" stroke="#B98557" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M76 4L92 12L84 20Z" fill="#E9B872"/></g><path d="M39 33H79L85 52H33Z" fill="#F3E3B5" class="gu-glow"/><text x="59" y="47" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="13" fill="#6B4A32">{ }</text><path d="M82 18L62 56H110Z" fill="#F3E3B5" opacity=".22"/>` },
        phone: { vb: [64, 100], w: 60, svg: `<g ${CUT}><rect x="6" y="4" width="52" height="92" rx="10" fill="#4A3D38"/></g><rect x="11" y="12" width="42" height="72" rx="4" fill="#FFF4E6"/><path transform="translate(19 30) scale(.78)" d="M17 28C3 18 0 10 5 5C9 1 15 3 17 8C19 3 25 1 29 5C34 10 31 18 17 28Z" fill="#D9545E" class="gu-beat"/><circle cx="32" cy="90" r="3" fill="#8B7B6B"/>` },
    };

    // ฉากต่อช่วงวัย: sky = สีท้องฟ้า, left/right = ของบนผิวดาว (มุมจากยอดดาว), deco = ของบนฟ้า
    const SCENES = [
        { sky: '#F8E3E3', left: 'slide', right: 'blocks', deco: [['sun', 34, 52, 50], ['cloud', 270, 64, 70, 'drift']] },
        { sky: '#F3E7D3', left: 'school', right: 'flagpole', deco: [['sun', 296, 50, 46], ['cloud', 30, 70, 62, 'drift'], ['bird', 230, 96, 28]] },
        { sky: '#E3EAD8', left: 'gate', right: 'bike', deco: [['cloud', 24, 60, 70, 'drift'], ['cloud', 280, 90, 52, 'drift'], ['bird', 90, 110, 26], ['bird', 120, 96, 20]] },
        { sky: '#F2E2C6', left: 'goal', right: 'ball', deco: [['sun', 30, 46, 58], ['cloud', 262, 74, 66, 'drift']] },
        { sky: '#E2E5D2', left: 'books', right: 'podium', deco: [['cloud', 36, 58, 66, 'drift'], ['cloud', 276, 84, 56, 'drift'], ['bird', 250, 120, 26]] },
        { sky: '#ECE1D3', left: 'monitor', right: 'hospital', deco: [['sun', 300, 48, 44], ['cloud', 28, 66, 66, 'drift']] },
        { sky: '#3E322C', left: 'desk', right: 'phone', deco: [['moon', 26, 44, 52], ['star', 130, 66, 16, 'tw'], ['star', 96, 92, 11, 'tw'], ['star', 236, 108, 13, 'tw'], ['star', 60, 140, 10, 'tw'], ['star', 330, 130, 12, 'tw']] },
    ];
    const DECO = { sun: [60, 60, sun], cloud: [80, 40, cloud], bird: [30, 12, bird], moon: [60, 60, moon], star: [20, 20, star] };

    function svg(vb, inner, w) {
        const h = Math.round(w * vb[1] / vb[0]);
        return `<svg viewBox="-6 -6 ${vb[0] + 12} ${vb[1] + 12}" width="${w + 12 * w / vb[0]}" height="${h + 12 * w / vb[0]}" style="display:block; overflow:visible;">${inner}</svg>`;
    }

    // ---------- ดาว: ผืนกลม + หญ้า/ดอกไม้/ก้อนหินรอบๆ (หมุนทั้งดวง) ----------
    function planetSVG() {
        let deco = '';
        for (let a = 0; a < 360; a += 15) {
            const k = (a / 15) % 4;
            const inner = k === 0
                ? '<path d="M-7 2Q-6 -8 -3 -12Q-1 -5 0 2Q1 -9 5 -14Q5 -5 7 2Z" fill="#9DB089"/>'
                : k === 2
                    ? '<path d="M0 2V-10" stroke="#9DB089" stroke-width="2"/><circle cy="-12" r="4" fill="#F6CAD6"/><circle cy="-12" r="1.6" fill="#E9B872"/>'
                    : k === 1 ? '<ellipse cy="1" rx="6" ry="3.4" fill="#C2A27C"/>' : '<path d="M-4 2Q-3 -6 0 -8Q3 -6 4 2Z" fill="#B3C49D"/>';
            deco += `<g transform="rotate(${a}) translate(0 ${-R + 1})">${inner}</g>`;
        }
        // จุดลายบนผิวดาว
        const spots = [[-70, -80, 16], [46, -100, 10], [80, -34, 20], [-24, -24, 12], [-92, 12, 10], [24, 46, 18], [-58, 80, 14], [92, 70, 11], [0, 116, 10], [-115, -46, 8], [10, -128, 6]]
            .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#CDB08C" opacity=".7"/>`).join('');
        return `<svg class="gu-planet" viewBox="-180 -180 360 360" width="360" height="360" aria-hidden="true">
            <g filter="url(#gucut)"><circle r="${R}" fill="#DCC6A5"/>${deco}</g>
            <circle r="${R}" fill="url(#guShade)"/>${spots}</svg>`;
    }
    // ---------- เศษกระดาษ (วาป/โผล่) + หัวใจ ----------
    function burst(x, y, n = 14) {
        const colors = ['#FFFDF8', '#E7D3BD', '#F6CAD6', '#C9D8BE', '#D2AE88', '#FFFFFF', '#F2C987'];
        for (let i = 0; i < n; i++) {
            const b = document.createElement('i');
            b.className = 'gu-bit';
            b.style.left = (x - 30 + Math.random() * 60) + 'px';
            b.style.top = (y - 60 + Math.random() * 80) + 'px';
            b.style.background = colors[i % colors.length];
            b.style.width = (5 + Math.random() * 6) + 'px';
            b.style.height = (4 + Math.random() * 5) + 'px';
            b.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
            b.style.setProperty('--dy', (-60 - Math.random() * 100) + 'px');
            b.style.setProperty('--rr', (Math.random() * 720 - 360) + 'deg');
            b.style.animationDelay = (Math.random() * .12) + 's';
            root.appendChild(b);
            setTimeout(() => b.remove(), 1900);
        }
    }
    function heart() {
        const h = document.createElement('div');
        h.className = 'gu-heart';
        h.innerHTML = cfg.heart;
        h.style.left = (CX - 13 + Math.random() * 10) + 'px';
        h.style.top = (CY - R - cfg.final.height - 10 - Math.random() * 30) + 'px';
        h.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
        root.appendChild(h);
        setTimeout(() => h.remove(), 2700);
    }
    // จุดบนผิวโลกที่มุม a (องศาจากยอด) → พิกัดในกล่อง .gu
    const onSurface = (a, lift = 0) => {
        const r = (a * Math.PI) / 180;
        return [CX + (R + lift) * Math.sin(r), CY - (R + lift) * Math.cos(r)];
    };

    // ---------- ฉากของรอบที่ i (ของบนผิวโลก + ของบนฟ้า + สีฟ้า) ----------
    function buildScene(i) {
        const sc = SCENES[i];
        const group = document.createElement('div');
        group.className = 'gu-set';
        [['left', -PROP_ANGLE], ['right', PROP_ANGLE]].forEach(([side, a], j) => {
            const p = P[sc[side]];
            const el = document.createElement('div');
            el.className = 'gu-prop';
            el.style.transform = `rotate(${a}deg) translateY(${-R + 6}px)`;
            el.innerHTML = `<div class="gu-pop" style="animation-delay:${.1 + j * .18}s">${svg(p.vb, p.svg, p.w)}</div>`;
            group.appendChild(el);
        });
        props.appendChild(group);
        const sk = document.createElement('div');
        sk.className = 'gu-set';
        sc.deco.forEach(([kind, x, y, w, cls], j) => {
            const [vw, vh, inner] = DECO[kind];
            const el = document.createElement('div');
            el.className = 'gu-deco' + (cls ? ' gu-' + cls : '');
            el.style.left = x + 'px'; el.style.top = y + 'px';
            el.style.animationDelay = (-Math.random() * 6) + 's';
            el.innerHTML = `<div class="gu-pop" style="animation-delay:${.25 + j * .12}s">${svg([vw, vh], inner, w)}</div>`;
            sk.appendChild(el);
        });
        skyDeco.appendChild(sk);
        sky.style.backgroundColor = sc.sky;
        root.classList.toggle('is-night', i === SCENES.length - 1);
    }
    function foldOld() {
        [props, skyDeco].forEach(layer => [...layer.children].forEach(g => {
            g.classList.add('is-fold');
            setTimeout(() => g.remove(), 700);
        }));
    }

    const ver = () => (cfg.ver ? '?v=' + cfg.ver : '');   // ใส่ GROW.ver ได้ถ้าต้องการกันแคชรูป (ปกติ Vercel เช็ครูปใหม่ทุกครั้งอยู่แล้ว)
    function setFig(walker, src, h) {
        walker.querySelector('img').src = src + ver();
        walker.style.setProperty('--h', h + 'px');
    }
    function place(walker, a) {
        walker.style.transform = `rotate(${a}deg) translateY(${-R + 3}px)`;
    }

    // ---------- เริ่มรอบใหม่: ชุดใหม่ ตัวโตขึ้น ฉากใหม่ (วาปมาโผล่ซ้ายสุด) ----------
    function startLap(i) {
        const first = lap < 0;
        clearSays();
        lap = i;
        const s = cfg.laps[i];
        setFig(him, `${cfg.dir}w${i + 1}-him.webp`, s.height);
        setFig(her, `${cfg.dir}w${i + 1}-her.webp`, Math.round(s.height * s.ratio));
        capPlace.textContent = s.place;
        if (!first) foldOld();
        setTimeout(() => { if (lap === i) buildScene(i); }, first ? 0 : 380);   // ข้ามถ้ารอบเปลี่ยนไปแล้ว
        const [x, y] = onSurface(-ARC, 40);
        burst(x, y, 16);
        window.Music && Music.sfx('pop');
    }

    // ---------- ป้ายเวลา (อ.1 → ปี 3) ----------
    function setLabel(text) {
        if (text === label) return;
        label = text;
        capYear.textContent = text;
        cap.classList.remove('is-tick'); void cap.offsetWidth; cap.classList.add('is-tick');
        window.Music && Music.sfx('pat');
    }

    // ---------- ตอนจบ: หยุดกลางโลก แล้วหันหน้ามาหากล้อง ----------
    function face() {
        faced = true;
        clearSays();
        [him, her].forEach(w => w.classList.remove('is-back', 'is-idle', 'is-run'));
        [him, her].forEach(w => w.classList.add('is-flip'));
        setTimeout(() => {
            const f = cfg.final;
            setFig(him, `${cfg.dir}s7-him.webp`, f.height);
            setFig(her, `${cfg.dir}s7-her.webp`, Math.round(f.height * f.ratio));
            [him, her].forEach(w => w.classList.remove('is-flip'));
            root.classList.add('is-final');
            capPlace.textContent = f.place;
            setTimeout(heart, 500);
            heartTimer = setInterval(heart, 1000);
            window.Music && Music.sfx('chime');
            // สองคนพูดพร้อมกัน
            if (f.say) setTimeout(() => {
                const b = makeSay(f.say);
                b.classList.add('gu-say--big');
                placeSay(b, ...headOf(-GAP / 2, f.height));
                // โชว์ 3.5 วิ แล้วค่อยๆ เฟดหาย (ใช้ Web Animations ให้เฟดนุ่มแน่นอน ไม่ชนกับแอนิเมชันตอนเด้งขึ้น)
                setTimeout(() => {
                    const fade = b.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }],
                        { duration: 1600, easing: 'ease-in-out', fill: 'forwards' });
                    fade.onfinish = () => b.remove();
                }, f.sayMs || 3500);
            }, 900);
        }, 220);
        setLabel(cfg.final.year);
    }

    // ---------- บอลลูนคำพูด (กระดาษขาว) ----------
    const says = new Map();
    function makeSay(text, both) {
        const b = document.createElement('div');
        b.className = 'gu-say' + (both ? ' gu-say--both' : '');
        b.innerHTML = `<span class="cg-thai">${text}</span>`;
        root.appendChild(b);
        window.Music && Music.sfx('pat');
        return b;
    }
    // จุดเหนือหัวคนพูด: ตัวเอียงออกตามผิวโลก เลยใช้ปลายหัวจริง (ไม่ยกสูงเกินหัว)
    const headOf = (a, h) => onSurface(a, h + 8);
    // วางบอลลูนให้หางชี้ที่ (hx, hy); ตัวกล่องเลื่อนหลบขอบจอได้ แต่หางยังชี้หัวเหมือนเดิม
    function placeSay(el, hx, hy) {
        if (!el._w) el._w = el.offsetWidth;   // วัดครั้งเดียว (วัดทุกเฟรมทำให้มือถือกระตุก)
        const half = el._w / 2, pad = 8, W = CX * 2;
        const bx = Math.max(half + pad, Math.min(W - half - pad, hx));
        el.style.left = bx + 'px'; el.style.top = hy + 'px';
        el.style.setProperty('--tail', Math.max(14, Math.min(el._w - 14, half + hx - bx)) + 'px');
    }
    function clearSays() {
        says.forEach(b => { b.classList.add('is-out'); setTimeout(() => b.remove(), 300); });
        says.clear();
    }

    // ---------- เวลาของแต่ละรอบ (รอบที่มีบทพูดยาวกว่า ตาม w) ----------
    let lapStart = [], lapDur = [];
    function lapAt(sec) {
        let i = 0;
        while (i < lapStart.length - 1 && sec >= lapStart[i + 1]) i++;
        return [i, Math.max(0, Math.min(1, (sec - lapStart[i]) / lapDur[i]))];
    }
    const inside = (p, r) => !!r && p >= r[0] && p < r[1];   // ต้องคืน true/false เสมอ (classList.toggle กับ undefined = สลับทุกเฟรม)

    // ---------- ทุกเฟรม: ตำแหน่งบนผิวโลกตามเวลาเพลง ----------
    function frame(now) {
        raf = requestAnimationFrame(frame);
        const sec = songSec + Math.min(.6, (now - songAt) / 1000);   // เดาเวลาระหว่างรอบที่ record.js ส่งมา
        const lastLap = cfg.laps.length - 1;
        if (sec >= faceAt) {   // จบ: ยืนคู่กันกลางโลก
            if (lap !== lastLap) startLap(lastLap);
            place(him, -GAP / 2); place(her, GAP / 2);
            him.style.opacity = her.style.opacity = 1;
            if (!faced) face();
            return;
        }
        const [i, p] = lapAt(sec);
        if (i !== lap) startLap(i);
        const L = cfg.laps[i], ev = L.events || {};
        const last = i === lastLap;

        // หยุดเดินช่วง stop: ความคืบหน้าบนโลก (pe) ค้างไว้ แล้วเดินเร็วขึ้นนิดในช่วงอื่นให้ครบรอบพอดี
        let pe = p;
        if (ev.stop) {
            const [a, b] = ev.stop, len = b - a;
            pe = (p < a ? p : p < b ? a : p - len) / (1 - len);
        }
        const c = last ? -ARC + ARC * pe : -ARC + 2 * ARC * pe;   // รอบสุดท้ายเดินแค่ถึงกลางโลก

        // เดินตามไม่ทัน: เขาค่อยๆ ห่างออกไป แล้ววิ่งตามจนทัน
        let lag = 0;
        if (inside(p, ev.lag)) {
            const [a, b] = ev.lag;
            lag = (ev.lagDeg || 18) * Math.sin(Math.PI * (p - a) / (b - a));
        }
        const aHim = c - GAP / 2 - lag, aHer = c + GAP / 2;
        place(him, aHim); place(her, aHer);
        him.classList.toggle('is-run', !!ev.lag && p >= (ev.lag[0] + ev.lag[1]) / 2 && p < ev.lag[1]);
        const idle = inside(p, ev.stop);
        him.classList.toggle('is-idle', idle); her.classList.toggle('is-idle', idle);
        her.classList.toggle('is-back', inside(p, ev.turn));   // เธอหันกลับมาคุย

        // บอลลูนคำพูด: โผล่/หายตามช่วง แล้วลอยตามหัวคนพูด
        (ev.says || []).forEach(([who, text, a, b], k) => {
            const key = i + ':' + k;
            const on = p >= a && p < b;
            let el = says.get(key);
            if (on && !el) { el = makeSay(text); says.set(key, el); }
            if (!on && el) { el.classList.add('is-out'); setTimeout(() => el.remove(), 300); says.delete(key); return; }
            if (el) {
                const isHim = who === 'him';
                const h = isHim ? L.height : L.height * L.ratio;
                placeSay(el, ...headOf(isHim ? aHim : aHer, h));
            }
        });

        // ค่อยๆ โผล่ตอนเริ่มรอบ / จางหายตอนวาปที่ขอบขวา (รอบสุดท้ายไม่ต้องหาย)
        const op = Math.max(0, Math.min(1, p / .07, last ? 1 : (1 - p) / .09));
        him.style.opacity = her.style.opacity = op;
        if (!last && p > .93 && !him.dataset.warped) {
            him.dataset.warped = '1';
            const [x, y] = onSurface(ARC, 50);
            burst(x, y, 12);
        }
        if (p < .5) delete him.dataset.warped;
        // ป้ายปี: แต่ละรอบมีหลายปี เปลี่ยนตามสัดส่วนที่เดินไป
        let t = L.years[0][0];
        L.years.forEach(([name, at]) => { if (p >= at) t = name; });
        setLabel(t);
    }

    // sec = เวลาที่เพลงเล่นไปแล้วนับจากจุดเริ่ม (1:03)
    function time(sec) {
        if (!root || root.classList.contains('is-done')) return;
        songSec = sec; songAt = performance.now();
        if (!root.classList.contains('is-on')) {
            root.classList.add('is-on');
            raf = requestAnimationFrame(frame);
        }
    }

    function end() {
        if (!root) return;
        clearInterval(heartTimer);
        root.classList.add('is-done');
        setTimeout(() => cancelAnimationFrame(raf), 2500);
    }

    function preload() {
        const files = ['s7-him.webp', 's7-her.webp'];
        cfg.laps.forEach((s, i) => files.push(`w${i + 1}-him.webp`, `w${i + 1}-her.webp`));
        return files.map(f => new Promise(r => {   // คืน promise ให้หน้าโหลดนับว่าเสร็จจริงเมื่อไหร่
            const im = new Image();
            im.onload = im.onerror = r;
            im.src = cfg.dir + f + ver();
        }));
    }

    function init(config) {
        cfg = config;
        root = $('growUp'); if (!root) return;
        him = $('guHim'); her = $('guHer'); cap = $('guCap'); capYear = $('guCapYear'); capPlace = $('guCapPlace');
        world = $('guWorld'); props = $('guProps'); sky = $('guSky'); skyDeco = $('guSkyDeco');
        // แบ่งเวลาเดินตามน้ำหนัก w ของแต่ละรอบ แล้วเหลือเวลายืนหันหน้า cfg.final.hold วินาที
        const walk = cfg.span - cfg.final.hold;
        const total = cfg.laps.reduce((n, l) => n + (l.w || 1), 0);
        let acc = 0;
        lapStart = []; lapDur = [];
        cfg.laps.forEach(l => { const d = walk * (l.w || 1) / total; lapStart.push(acc); lapDur.push(d); acc += d; });
        faceAt = walk;
        world.insertAdjacentHTML('afterbegin', planetSVG());
    }

    window.GrowUp = { init, preload, time, end };
})();
