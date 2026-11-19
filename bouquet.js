/* =====================================================================
   ช่อดอกไม้จริง (คอลลาจ)
   - ดอกทิวลิปชมพูทั้งก้าน รูปถ่ายจริงไดคัทขอบขาว (bouquet/*.png จาก Unsplash, ใช้ฟรี)
   - เริ่ม: กระดาษห่อด้านหลังโผล่ → ดอกไม้กระดึ๊บๆ เข้ามาจากขอบจอทีละดอก →
            กระดาษด้านหน้าห่อขึ้นมา → ผูกโบว์ → ป้ายแกว่ง
   - ดีไซน์ช่อตามช่อที่เธอถือในรูป (ช่อสไตล์เกาหลี กระดาษขาว-ชมพู ระบายลูกไม้ โบว์ผ้าโปร่ง)
   ===================================================================== */
(function () {
    // ดีไซน์ตามช่อที่เธอถือในรูป: ช่อสไตล์เกาหลี — กระดาษห่อขาว/ชมพูบานเป็นแผ่นๆ ด้านหลัง (มีแผ่นพิมพ์ตัวหนังสือ),
    // ดอกไม้อัดแน่นเป็นพุ่มกลม, ระบายลูกไม้ขาวรัดใต้ดอก, กระดาษทิชชูชมพูห่อเรียวลง, โบว์ผ้าโปร่งชมพูหางยาว
    const NECK = { x: 187, y: 548 };
    const OUT = 'stroke="#FFFFFF" stroke-width="5" paint-order="stroke" stroke-linejoin="round"';

    // ทิวลิปทั้งก้าน: [ไฟล์, มุมเอียง, ความสูง, กว้าง/สูงของรูป] — โคนก้านทุกดอกรวมกันที่จุดผูกโบว์ แล้วบานออกเป็นพัด
    // เรียงจากหลังไปหน้า (ลำดับเดียวกับที่กระดึ๊บเข้ามา)
    const BASE = { x: 187, y: 566 };
    const TULIPS = [
        ['tulip-3', -24, 312, 151 / 520],
        ['tulip-6', 23, 318, 155 / 520],
        ['tulip-4', -14, 344, 134 / 520],
        ['tulip-1', 11, 350, 178 / 520],
        ['tulip-t0', -2, 372, 112 / 520],
        ['tulip-0', -11, 290, 214 / 520],
        ['tulip-5', 8, 296, 188 / 520],
        ['tulip-2', 1, 262, 297 / 520],
    ];

    // แผ่นกระดาษห่อด้านหลัง: [cx, cy, w, h, หมุน, สี, ข้อความ]
    const SHEETS = [
        [104, 326, 120, 155, -34, '#F8DDE3', ''],
        [272, 322, 120, 155, 32, '#FFFDF8', ''],
        [130, 262, 150, 181, -16, '#FFFDF8', ''],
        [190, 240, 130, 172, -3, '#F6D3DA', ''],
        [246, 258, 156, 177, 15, '#FFFDF8', 'HAPPY BIRTHDAY!'],
    ];

    function sheet([cx, cy, w, h, r, fill, text]) {
        const x = cx - w / 2, y = cy - h / 2;
        return `<g transform="rotate(${r} ${cx} ${cy})">` +
            `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${OUT}/>` +
            `<path d="M${x + 6} ${y + 6} L${x + w - 6} ${y + 6}" stroke="rgba(160,112,76,.08)" stroke-width="10"/>` +
            (text ? `<text x="${cx}" y="${y + 30}" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="13" letter-spacing="1" fill="#6B4A32">${text}</text>` +
                    `<path d="M${cx - 34} ${y + 38} h68" stroke="#C9A27E" stroke-width="1"/>` : '') +
            `</g>`;
    }

    // ระบายลูกไม้/ผ้าโปร่งรอบฐานพุ่มดอกไม้
    function ruffle() {
        let back = '', front = '';
        const pts = 11;
        for (let i = 0; i <= pts; i++) {
            const t = i / pts, x = 80 + t * 214, y = 400 + Math.sin(t * Math.PI) * 30;
            back += `<ellipse cx="${x.toFixed(1)}" cy="${(y - 6).toFixed(1)}" rx="24" ry="15" fill="#F8DDE3" fill-opacity=".9"/>`;
        }
        for (let i = 0; i < pts; i++) {
            const t = (i + .5) / pts, x = 80 + t * 214, y = 404 + Math.sin(t * Math.PI) * 30;
            front += `<path d="M${(x - 22).toFixed(1)} ${y.toFixed(1)} q22 -22 44 0 q-22 14 -44 0z" fill="#FFFFFF" fill-opacity=".93" stroke="#F0DFE3" stroke-width="1"/>` +
                     `<path d="M${(x - 10).toFixed(1)} ${(y - 4).toFixed(1)} q10 -8 20 0" stroke="#EBD7DC" stroke-width="1" fill="none"/>`;
        }
        return back + front;
    }

    function build(el) {
        const flowers = TULIPS.map(([f, r, h, ratio], i) => {
            const w = Math.round(h * ratio);
            const ax = BASE.x + r * 0.5;
            const sx = r < -5 ? -260 : r > 5 ? 260 : (i % 2 ? -60 : 60);
            const sy = r < -5 || r > 5 ? 80 + (i * 41) % 120 : 520;
            return `<div class="bq" style="left:${Math.round(ax - w / 2)}px; top:${BASE.y - h}px; width:${w}px; --r:${r}deg; --sx:${sx}px; --sy:${sy}px; --d:${(0.8 + i * 0.5).toFixed(2)}s;">` +
                `<img src="bouquet/${f}.png" alt=""></div>`;
        }).join('');
        // ปลายก้านที่โผล่ใต้กระดาษห่อ (มัดก้านด้านล่าง)
        let stems = '';
        for (let i = 0; i < 8; i++) {
            const x0 = 174 + i * 4, x1 = 158 + i * 8.5, y1 = 716 + (i % 3) * 5;
            stems += `<path d="M${x0} 600 L${x1} ${y1}" stroke="${i % 2 ? '#8DB57A' : '#9CC488'}" stroke-width="5.5" stroke-linecap="round"/>` +
                     `<ellipse cx="${x1}" cy="${y1 + 1}" rx="2.6" ry="1.6" fill="#D5EBC6"/>`;
        }
        const N = NECK;
        el.innerHTML = `
            <svg class="bq-layer bq-back" viewBox="0 0 375 760" aria-hidden="true">
                ${SHEETS.map(sheet).join('')}
                <g class="bq-stemends">${stems}</g>
            </svg>
            ${flowers}
            <svg class="bq-layer bq-front" viewBox="0 0 375 760" aria-hidden="true">
                <!-- ทิชชูชมพูห่อเรียวลง -->
                <path d="M78 410 Q187 452 296 410 L226 640 L148 640 Z" fill="#F8DDE3" ${OUT}/>
                <path d="M96 424 Q187 464 278 424 L216 660 L158 660 Z" fill="#FFFDF8" ${OUT}/>
                <path d="M120 440 Q150 560 170 656 M254 440 Q224 560 204 656" stroke="#F1DCE1" stroke-width="2" fill="none"/>
                <path d="M106 430 L132 470 L118 470 Z M268 430 L242 470 L256 470 Z" fill="#F6D3DA" opacity=".8"/>
                <!-- ระบายลูกไม้ใต้ดอก -->
                ${ruffle()}
            </svg>
            <svg class="bq-layer bq-deco" viewBox="0 0 375 760" aria-hidden="true">
                <g class="bq-bow" style="--ox:${N.x}px; --oy:${N.y}px">
                    <!-- หางริบบิ้นผ้าโปร่งยาวๆ -->
                    <path d="M${N.x - 4} ${N.y + 4} C${N.x - 22} ${N.y + 60} ${N.x - 4} ${N.y + 110} ${N.x - 30} ${N.y + 168} L${N.x - 12} ${N.y + 170} C${N.x + 8} ${N.y + 110} ${N.x - 6} ${N.y + 60} ${N.x + 6} ${N.y + 6} Z" fill="#F4C3CE" fill-opacity=".85" ${OUT}/>
                    <path d="M${N.x + 4} ${N.y + 4} C${N.x + 26} ${N.y + 54} ${N.x + 14} ${N.y + 100} ${N.x + 40} ${N.y + 150} L${N.x + 24} ${N.y + 154} C${N.x + 2} ${N.y + 100} ${N.x + 10} ${N.y + 56} ${N.x - 4} ${N.y + 8} Z" fill="#F7D3DB" fill-opacity=".85" ${OUT}/>
                    <!-- ห่วงโบว์ -->
                    <path d="M${N.x} ${N.y} c-30 -26 -58 -6 -44 14 c10 12 28 2 44 -14z M${N.x} ${N.y} c30 -26 58 -6 44 14 c-10 12 -28 2 -44 -14z" fill="#F4C3CE" fill-opacity=".92" ${OUT}/>
                    <path d="M${N.x - 8} ${N.y - 6} c-12 -6 -22 -2 -24 4 M${N.x + 8} ${N.y - 6} c12 -6 22 -2 24 4" stroke="#E7A9B8" stroke-width="1.2" fill="none"/>
                    <ellipse cx="${N.x}" cy="${N.y}" rx="8" ry="7" fill="#EDAFBE"/>
                </g>
                <g class="bq-tag" style="--ox:${N.x + 34}px; --oy:${N.y + 6}px">
                    <path d="M${N.x + 34} ${N.y + 6} L${N.x + 62} ${N.y + 54}" stroke="#C9A27E" stroke-width="1.2"/>
                    <g transform="rotate(-12 ${N.x + 74} ${N.y + 82})">
                        <path d="M${N.x + 46} ${N.y + 60} h64 v48 h-64 l-10 -24 z" fill="#FFFDF8" ${OUT}/>
                        <circle cx="${N.x + 46}" cy="${N.y + 84}" r="3" fill="#E3CDAF"/>
                        <text x="${N.x + 80}" y="${N.y + 82}" text-anchor="middle" font-family="Caveat, cursive" font-size="20" fill="#6B4A32">for you</text>
                        <path transform="translate(${N.x + 72} ${N.y + 88}) scale(.45)" d="M17 28C3 18 0 10 5 5C9 1 15 3 17 8C19 3 25 1 29 5C34 10 31 18 17 28Z" fill="#8B5E3C"/>
                    </g>
                </g>
            </svg>`;
    }

    function start(el, onDone) {
        el.classList.remove('is-built', 'is-wrapping');
        void el.offsetWidth;
        el.classList.add('is-building');
        const crawl = 2.3, M = window.Music;
        TULIPS.forEach((_, i) => {
            const start = (0.8 + i * 0.5) * 1000;
            // กระโดด 4 ครั้งตามจังหวะใน keyframes (เสียงสูงขึ้นทีละขั้น) แล้วลงจอดดัง "ติ๊ง"
            [.26, .5, .74, .9].forEach((f, h) => setTimeout(() => M && M.sfx('hop', h * 3 + (i % 3)), start + crawl * 1000 * f));
            setTimeout(() => M && M.sfx('tink'), start + crawl * 1000 - 80);
        });
        const lastLand = (0.8 + (TULIPS.length - 1) * 0.5 + crawl) * 1000;
        setTimeout(() => { el.classList.add('is-wrapping'); M && M.sfx('paper'); }, lastLand + 300);
        setTimeout(() => { el.classList.add('is-built'); M && M.sfx('zip'); }, lastLand + 1700);
        setTimeout(() => { M && M.sfx('chime'); onDone && onDone(); }, lastLand + 2500);
    }

    window.Bouquet = { build, start };
})();
