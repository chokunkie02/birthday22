/* =====================================================================
   เพลงประจำแต่ละหน้า (แต่งใหม่ทั้งหมด ยกเว้น Happy Birthday ซึ่งเป็นสาธารณสมบัติ)
   gate      : วอลทซ์กล่องดนตรี + แพด + กระดิ่งคลอ + ชิคเกอร์ (F major)
   countdown : ลุ้นๆ อาร์เปจจิโอไต่ขึ้น + เบสเต้น + กลองเบาๆ
   cake      : เงียบๆ แพดอุ่น + เทียนเปาะแปะ + กระดิ่งระยิบ (ฟีลก่อนเป่าเค้ก)
   happy     : Happy Birthday กล่องดนตรี + เสียงประสาน + คอร์ด + กลองเบาๆ
   letter    : เพลงกล่อมเปียโน + สตริงแพด + ทำนองคู่ + จังหวะหัวใจ (A minor)
   flowers   : สดใสเด้งๆ กระดิ่ง + พลัค + เบส + กลองตบมือ (D major)
   เปลี่ยนหน้า = ค่อยๆ เฟดเพลงเก่าออก เพลงใหม่เข้า
   ใช้: Music.start(), Music.scene('cake'), Music.sfx('pop'), Music.toggle(), Music.fadeOut(ms)
   ===================================================================== */
(function () {
    let started = false, built = false, muted = false;
    let master, reverb, inst = {}, tracks = {}, current = null, wanted = 'gate';
    const LEVEL = -9;
    const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const IS_PHONE = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    // ช่องเสียงแบบบัฟเฟอร์ใหญ่ (latencyHint: 'playback') — ค่าเดิม 'interactive' หน่วงแค่ ~4ms
    // บน Android บางรุ่นช่องเสียงหน่วงต่ำจะค้างเงียบตอนเครื่องทำงานหนัก (ระบบยังบอก running แต่ไม่มีเสียงออก)
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const old = Tone.getContext();
        Tone.setContext(new Tone.Context(new AC({ latencyHint: 'playback' })));   // Tone 14 ไม่อ่าน latencyHint เอง ต้องสร้างช่องเสียงเองแล้วส่งให้
        try { old.rawContext.suspend(); } catch (e) {}   // ช่องเสียงเดิมของ Tone ไม่ได้ใช้แล้ว ปิดไว้ไม่ให้ค้างช่องลำโพง
    } catch (e) {}
    try { Tone.getContext().lookAhead = 0.2; } catch (e) {}
    // หมายเหตุ: หลัง setContext ต้องใช้ Tone.getContext()/getTransport() เสมอ — Tone.context/Tone.Transport ยังชี้ช่องเสียงเก่า

    const sec = (bpm, beats) => beats * 60 / bpm;

    function unlockIOSSilentSwitch() {
        try {
            const rate = 8000, len = 800, buf = new ArrayBuffer(44 + len), v = new DataView(buf);
            const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
            w(0, 'RIFF'); v.setUint32(4, 36 + len, true); w(8, 'WAVE'); w(12, 'fmt ');
            v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
            v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
            w(36, 'data'); v.setUint32(40, len, true);
            for (let i = 0; i < len; i++) v.setUint8(44 + i, 128);
            const a = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
            a.loop = true; a.volume = 0.01; a.setAttribute('playsinline', '');
            a.play().catch(() => {});
        } catch (e) { /* ไม่เป็นไร */ }
    }

    // ---------- เครื่องดนตรี (ทุกเพลงมีชุดของตัวเอง เวลาเฟดข้ามเพลงจะได้ไม่ชนกัน) ----------
    function voices(dest) {
        const fm = (o) => new Tone.PolySynth(Tone.FMSynth, o).connect(dest);
        const box = { harmonicity: 8, modulationIndex: 1.6, oscillator: { type: 'sine' }, modulation: { type: 'sine' },
            envelope: { attack: 0.002, decay: 1.5, sustain: 0, release: 1.5 },
            modulationEnvelope: { attack: 0.002, decay: 0.22, sustain: 0, release: 0.2 } };
        const keys = { harmonicity: 2, modulationIndex: 3, oscillator: { type: 'sine' }, modulation: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 2.2, sustain: 0.05, release: 1.8 },
            modulationEnvelope: { attack: 0.005, decay: 0.6, sustain: 0, release: 0.5 } };
        const bell = { harmonicity: 3.5, modulationIndex: 6, oscillator: { type: 'sine' }, modulation: { type: 'sine' },
            envelope: { attack: 0.001, decay: 1.1, sustain: 0, release: 1.2 },
            modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 } };
        const padFilter = new Tone.Filter(1400, 'lowpass').connect(dest);
        const v = {
            box: fm(box), keys: fm(keys), bell: fm(bell),
            bass: new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.9, sustain: 0.05, release: 1 } }).connect(dest),
            pluck: new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.28, sustain: 0, release: 0.2 } }).connect(dest),
            pad: new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fattriangle', count: 3, spread: 18 }, envelope: { attack: 1.6, decay: 1, sustain: 0.75, release: 3 } }).connect(padFilter),
            // กลองเบาๆ
            kick: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 5, envelope: { attack: 0.001, decay: 0.32, sustain: 0 } }).connect(dest),
            hat: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.035, sustain: 0 } }).connect(new Tone.Filter(7500, 'highpass').connect(dest)),
            snap: new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 } }).connect(new Tone.Filter(2200, 'bandpass').connect(dest)),
        };
        v.box.volume.value = -6; v.keys.volume.value = -9; v.bell.volume.value = -17; v.bass.volume.value = -17;
        v.pluck.volume.value = -16; v.pad.volume.value = -25; v.kick.volume.value = -16; v.hat.volume.value = -30; v.snap.volume.value = -24;
        ['box', 'keys', 'bell', 'bass', 'pluck', 'pad'].forEach(k => { v[k].maxPolyphony = 14; });
        return v;
    }

    // part ที่ใช้เวลาเป็นวินาที (ไม่ผูกกับ bpm ของ Transport → แต่ละเพลงคนละจังหวะได้)
    function part(events, loopSec, fn) {
        const p = new Tone.Part((time, ev) => fn(time, ev), events.map(e => ({ ...e, time: e.t })));
        p.loop = true; p.loopEnd = loopSec;
        return p;
    }
    // ทำโน้ตจากตาราง [ห้อง, จังหวะ, โน้ต, ความยาว]
    const notes = (rows, B, beatsPerBar) => rows.map(([bar, beat, n, d]) => ({ t: sec(B, bar * beatsPerBar + beat), n, d: sec(B, d) }));
    // จังหวะกลองซ้ำทุกห้อง
    function drumPart(v, B, beatsPerBar, bars, pattern) {
        const ev = [];
        for (let bar = 0; bar < bars; bar++)
            Object.entries(pattern).forEach(([inst, beats]) => beats.forEach(([beat, vel]) => ev.push({ t: sec(B, bar * beatsPerBar + beat), inst, vel })));
        return part(ev, sec(B, bars * beatsPerBar), (t, e) => {
            if (e.inst === 'kick') v.kick.triggerAttackRelease('C1', '8n', t, e.vel);
            else v[e.inst].triggerAttackRelease(e.inst === 'hat' ? 0.03 : 0.1, t, e.vel);
        });
    }

    // ---------- เพลง ----------
    function buildTracks() {
        const mk = (name, builder) => {
            const bus = new Tone.Volume(-Infinity).connect(reverb);
            const v = voices(bus);
            tracks[name] = { bus, parts: builder(v, bus) };
        };

        // 1) gate: กล่องดนตรีวอลทซ์ + แพดอุ่นๆ + กระดิ่งคลอ + ชิคเกอร์เบาๆ (3/4, 78 bpm)
        mk('gate', (v) => {
            const B = 78, b = (bar, beat) => sec(B, bar * 3 + beat);
            const M = [[0,0,'A5',1],[0,1,'G5',.5],[0,1.5,'A5',.5],[0,2,'C6',1],[1,0,'E5',3],[2,0,'D5',1],[2,1,'F5',1],[2,2,'A5',1],
                [3,0,'G5',2],[3,2,'E5',1],[4,0,'F5',1],[4,1,'A5',.5],[4,1.5,'C6',.5],[4,2,'F6',1],[5,0,'E6',1],[5,1,'D6',1],[5,2,'A5',1],
                [6,0,'A#5',1],[6,1,'A5',.5],[6,1.5,'G5',.5],[6,2,'D5',1],[7,0,'E5',3],[8,0,'D5',1],[8,1,'F5',1],[8,2,'A#5',1],
                [9,0,'C6',1],[9,1,'A#5',.5],[9,1.5,'A5',.5],[9,2,'G5',1],[10,0,'A5',1],[10,1,'C6',1],[10,2,'E6',1],[11,0,'D6',2],[11,2,'A5',1],
                [12,0,'A#5',1],[12,1,'D6',1],[12,2,'G5',1],[13,0,'A5',.5],[13,.5,'A#5',.5],[13,1,'C6',1],[13,2,'E5',1],[14,0,'F5',3],[15,1,'A5',1],[15,2,'C6',1]];
            const C = { F: ['F3', ['A3', 'C4', 'F4']], Am: ['A2', ['C4', 'E4', 'A4']], Bb: ['A#2', ['D4', 'F4', 'A#4']], C: ['C3', ['E4', 'G4', 'C5']], Dm: ['D3', ['F4', 'A4', 'D5']], Gm: ['G2', ['A#3', 'D4', 'G4']] };
            const prog = ['F','Am','Bb','C','F','Dm','Gm','C','Bb','C','Am','Dm','Gm','C','F','F'];
            const L = sec(B, 48);
            const left = [], pads = [], counter = [];
            prog.forEach((n, i) => {
                const [r, ch] = C[n];
                left.push({ t: b(i, 0), n: [r], v: .8 }, { t: b(i, 1), n: ch.slice(0, 2), v: .45 }, { t: b(i, 2), n: ch.slice(0, 2), v: .4 });
                if (i % 2 === 0) pads.push({ t: b(i, 0), n: ch, d: sec(B, 6) });
                // กระดิ่งคลอ: โน้ตบนของคอร์ดไล่ลง จังหวะ 3 ของบางห้อง
                if (i % 4 === 1 || i % 4 === 3) counter.push({ t: b(i, 2.5), n: Tone.Frequency(ch[2]).transpose(12).toNote() });
            });
            return [
                part(notes(M, B, 3), L, (t, e) => v.box.triggerAttackRelease(e.n, e.d, t, .75)),
                part(left, L, (t, e) => v.bass.triggerAttackRelease(e.n, sec(B, 1), t, e.v)),
                part(pads, L, (t, e) => v.pad.triggerAttackRelease(e.n, e.d, t, .5)),
                part(counter, L, (t, e) => v.bell.triggerAttackRelease(e.n, '8n', t, .55)),
                drumPart(v, B, 3, 16, { hat: [[1, .35], [2, .3], [2.5, .2]] }),
            ];
        });

        // 2) countdown: ลุ้นๆ — เบสเต้นตุ้บๆ, อาร์เปจจิโอไต่ขึ้น, ติ๊กนาฬิกา, กลองเบาๆ (4/4, 110 bpm)
        mk('countdown', (v) => {
            const B = 110, b = (bar, beat) => sec(B, bar * 4 + beat);
            const chords = [['C3', ['C4', 'E4', 'G4']], ['A2', ['A3', 'C4', 'E4']], ['F2', ['F3', 'A3', 'C4']], ['G2', ['G3', 'B3', 'D4']]];
            const arp = [], bass = [], pads = [];
            chords.forEach(([r, ch], bar) => {
                const up = [...ch, Tone.Frequency(ch[0]).transpose(12).toNote()];
                for (let s = 0; s < 8; s++) arp.push({ t: b(bar, s / 2), n: Tone.Frequency(up[s % 4]).transpose(12 + (s >= 4 ? 12 : 0)).toNote(), vel: .35 + s * .05 });
                for (let q = 0; q < 4; q++) bass.push({ t: b(bar, q), n: r });
                pads.push({ t: b(bar, 0), n: ch, d: sec(B, 4) });
            });
            const L = sec(B, 16);
            return [
                part(arp, L, (t, e) => v.pluck.triggerAttackRelease(e.n, '16n', t, e.vel)),
                part(bass, L, (t, e) => v.bass.triggerAttackRelease(e.n, sec(B, .5), t, .7)),
                part(pads, L, (t, e) => v.pad.triggerAttackRelease(e.n, e.d, t, .45)),
                drumPart(v, B, 4, 4, { kick: [[0, .7], [2, .55]], hat: [[.5, .4], [1.5, .4], [2.5, .4], [3.5, .5]], snap: [[1, .35], [3, .45]] }),
            ];
        });

        // 3) cake: เงียบๆ ลุ้นๆ — แพดอุ่น, เทียนแตกเปาะแปะ, กระดิ่งระยิบเบาๆ แบบสุ่ม (pentatonic)
        mk('cake', (v, bus) => {
            const crackleFilter = new Tone.Filter(3500, 'highpass').connect(bus);
            const crackle = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: .001, decay: .015, sustain: 0 } }).connect(crackleFilter);
            crackle.volume.value = -30;
            const pops = [];   // เว้นระยะกันเสียงทับกัน (NoiseSynth เล่นได้ทีละเสียง)
            for (let at = Math.random() * .3; at < 7.8; at += .12 + Math.random() * .45) pops.push({ t: +at.toFixed(3) });
            const twinkle = [];
            const penta = ['F6', 'G6', 'A6', 'C7', 'D7', 'F7'];
            for (let at = .6; at < 15.5; at += .9 + Math.random() * 1.4) twinkle.push({ t: +at.toFixed(2), n: penta[(Math.random() * penta.length) | 0] });
            let lastPop = 0;
            return [
                part([{ t: 0, n: ['F3', 'C4', 'A4', 'E5'] }, { t: 4, n: ['D3', 'A3', 'F4', 'C5'] }, { t: 8, n: ['A#2', 'F3', 'D4', 'A4'] }, { t: 12, n: ['C3', 'G3', 'E4', 'G4'] }],
                    16, (t, e) => v.pad.triggerAttackRelease(e.n, 3.9, t, .5)),
                part([{ t: 0, n: 'F2' }, { t: 4, n: 'D2' }, { t: 8, n: 'A#1' }, { t: 12, n: 'C2' }], 16, (t, e) => v.bass.triggerAttackRelease(e.n, 3.5, t, .35)),
                part(twinkle, 16, (t, e) => v.bell.triggerAttackRelease(e.n, '16n', t, .35)),
                part(pops, 8, (t) => {
                    if (t <= lastPop + .03) return;
                    lastPop = t;
                    crackle.triggerAttackRelease(.015, t, Math.random() * .6 + .2);
                }),
            ];
        });

        // 4) happy: Happy Birthday (สาธารณสมบัติ) — กล่องดนตรี + เสียงประสาน + คอร์ด + กลองเบาๆ + กระดิ่ง
        mk('happy', (v) => {
            const B = 92;
            const N = [['C5',.75],['C5',.25],['D5',1],['C5',1],['F5',1],['E5',2],['C5',.75],['C5',.25],['D5',1],['C5',1],['G5',1],['F5',2],
                ['C5',.75],['C5',.25],['C6',1],['A5',1],['F5',1],['E5',1],['D5',2],['A#5',.75],['A#5',.25],['A5',1],['F5',1],['G5',1],['F5',3]];
            let at = 0; const mel = N.map(([n, d]) => { const e = { t: sec(B, at), n, d: sec(B, d) }; at += d; return e; });
            // เสียงประสานคู่ 3 ใต้ทำนอง (ไม่ใส่โน้ตสั้น)
            const harm = mel.filter(e => e.d > sec(B, .5)).map(e => ({ ...e, n: Tone.Frequency(e.n).transpose(-4).toNote() }));
            const chordAt = [[1, 'F'], [4, 'C'], [7, 'C'], [10, 'F'], [13, 'F'], [16, 'Bb'], [19, 'F'], [22, 'C'], [25, 'F']];
            const CH = { F: ['F3', ['A3', 'C4', 'F4']], C: ['C3', ['G3', 'C4', 'E4']], Bb: ['A#2', ['A#3', 'D4', 'F4']] };
            const left = [], pads = [], bells = [];
            chordAt.forEach(([beat, c]) => {
                const [r, ch] = CH[c];
                left.push({ t: sec(B, beat), n: [r], v: .8 }, { t: sec(B, beat + 1), n: ch, v: .4 }, { t: sec(B, beat + 2), n: ch, v: .35 });
                pads.push({ t: sec(B, beat), n: ch, d: sec(B, 3) });
                bells.push({ t: sec(B, beat + 2.5), n: Tone.Frequency(ch[2]).transpose(24).toNote() });
            });
            const L = sec(B, at + 4);
            const drums = [];
            for (let beat = 1; beat < at; beat += 3) drums.push({ t: sec(B, beat), inst: 'kick', vel: .5 }, { t: sec(B, beat + 1), inst: 'hat', vel: .35 }, { t: sec(B, beat + 2), inst: 'hat', vel: .3 });
            return [
                part(mel, L, (t, e) => v.box.triggerAttackRelease(e.n, e.d, t, .8)),
                part(harm, L, (t, e) => v.keys.triggerAttackRelease(e.n, e.d, t, .35)),
                part(left, L, (t, e) => v.bass.triggerAttackRelease(e.n, sec(B, 1), t, e.v)),
                part(pads, L, (t, e) => v.pad.triggerAttackRelease(e.n, e.d, t, .45)),
                part(bells, L, (t, e) => v.bell.triggerAttackRelease(e.n, '16n', t, .45)),
                part(drums, L, (t, e) => e.inst === 'kick' ? v.kick.triggerAttackRelease('C1', '8n', t, e.vel) : v.hat.triggerAttackRelease(.03, t, e.vel)),
            ];
        });

        // 5) letter: เพลงกล่อมเปียโน + สตริงแพด + ทำนองคู่เสียงสูง + จังหวะหัวใจเบาๆ (4/4, 66 bpm, A minor → C)
        mk('letter', (v) => {
            const B = 66, b = (bar, beat) => sec(B, bar * 4 + beat);
            const M = [[0,0,'E5',2],[0,2,'C5',1],[0,3,'A4',1],[1,0,'F5',2],[1,2,'E5',1],[1,3,'C5',1],[2,0,'G5',3],[2,3,'E5',1],[3,0,'D5',4],
                [4,0,'E5',1],[4,1,'A5',1],[4,2,'G5',1],[4,3,'E5',1],[5,0,'F5',2],[5,2,'A5',2],[6,0,'G5',1],[6,1,'E5',1],[6,2,'D5',1],[6,3,'C5',1],[7,0,'D5',2],[7,2,'B4',2]];
            const counter = [[1,1,'A5',1],[1,2.5,'C6',1.5],[3,1,'B5',1],[3,2.5,'G5',1.5],[5,1,'C6',1],[5,3,'E6',1],[7,1,'B5',2]];
            const prog = [['A2', ['A3', 'C4', 'E4']], ['F2', ['F3', 'A3', 'C4']], ['C3', ['C4', 'E4', 'G4']], ['G2', ['G3', 'B3', 'D4']]];
            const arp = [], pads = [], beat = [];
            for (let bar = 0; bar < 8; bar++) {
                const [r, ch] = prog[bar % 4];
                [r, ch[0], ch[1], ch[2], ch[1], ch[0], ch[1], ch[2]].forEach((n, i) => arp.push({ t: b(bar, i / 2), n, vel: i === 0 ? .55 : .3 }));
                pads.push({ t: b(bar, 0), n: ch.map(x => Tone.Frequency(x).transpose(12).toNote()), d: sec(B, 4) });
                beat.push({ t: b(bar, 0), vel: .35 }, { t: b(bar, .35), vel: .22 });   // ตุ้บ-ตั้บ เหมือนหัวใจ
            }
            const L = sec(B, 32);
            return [
                part(notes(M, B, 4), L, (t, e) => v.keys.triggerAttackRelease(e.n, e.d, t, .7)),
                part(notes(counter, B, 4), L, (t, e) => v.bell.triggerAttackRelease(e.n, e.d, t, .3)),
                part(arp, L, (t, e) => v.bass.triggerAttackRelease(e.n, sec(B, .9), t, e.vel)),
                part(pads, L, (t, e) => v.pad.triggerAttackRelease(e.n, e.d, t, .4)),
                part(beat, L, (t, e) => v.kick.triggerAttackRelease('A0', '16n', t, e.vel)),
            ];
        });

        // 6) flowers: สดใสเด้งๆ — กระดิ่งเล่นทำนอง, พลัคอาร์เปจจิโอ, เบส, แพด, กลองเบาๆ ตบมือ (4/4, 100 bpm, D major)
        mk('flowers', (v) => {
            const B = 100, b = (bar, beat) => sec(B, bar * 4 + beat);
            const M = [[0,0,'F#5',.5],[0,.5,'A5',.5],[0,1,'D6',1],[0,2,'A5',.5],[0,2.5,'F#5',.5],[0,3,'A5',1],
                [1,0,'E5',.5],[1,.5,'A5',.5],[1,1,'C#6',1],[1,2,'B5',1],[1,3,'A5',1],
                [2,0,'D5',.5],[2,.5,'F#5',.5],[2,1,'B5',1],[2,2,'A5',.5],[2,2.5,'F#5',.5],[2,3,'D5',1],
                [3,0,'G5',1],[3,1,'B5',1],[3,2,'A5',2],
                [4,0,'F#5',.5],[4,.5,'A5',.5],[4,1,'D6',1],[4,2,'E6',.5],[4,2.5,'D6',.5],[4,3,'C#6',1],
                [5,0,'B5',1],[5,1,'A5',1],[5,2,'F#5',2],
                [6,0,'B5',.5],[6,.5,'A5',.5],[6,1,'G5',1],[6,2,'F#5',1],[6,3,'E5',1],
                [7,0,'E5',1],[7,1,'C#5',1],[7,2,'D5',2]];
            const prog = [['D3', ['D4', 'F#4', 'A4']], ['A2', ['C#4', 'E4', 'A4']], ['B2', ['B3', 'D4', 'F#4']], ['G2', ['G3', 'B3', 'D4']]];
            const acc = [], arp = [], pads = [];
            for (let bar = 0; bar < 8; bar++) {
                const [r, ch] = prog[bar % 4];
                acc.push({ t: b(bar, 0), n: [r], v: .8 }, { t: b(bar, 1.5), n: [r], v: .45 }, { t: b(bar, 2), n: [Tone.Frequency(r).transpose(7).toNote()], v: .6 }, { t: b(bar, 3.5), n: [r], v: .45 });
                const up = [ch[0], ch[1], ch[2], Tone.Frequency(ch[1]).transpose(12).toNote()];
                for (let s = 0; s < 8; s++) arp.push({ t: b(bar, s / 2), n: Tone.Frequency(up[s % 4]).transpose(12).toNote(), vel: s % 2 ? .25 : .35 });
                pads.push({ t: b(bar, 0), n: ch, d: sec(B, 4) });
            }
            const L = sec(B, 32);
            return [
                part(notes(M, B, 4), L, (t, e) => { v.box.triggerAttackRelease(e.n, e.d, t, .7); v.bell.triggerAttackRelease(e.n, '16n', t, .25); }),
                part(arp, L, (t, e) => v.pluck.triggerAttackRelease(e.n, '16n', t, e.vel)),
                part(acc, L, (t, e) => v.bass.triggerAttackRelease(e.n, sec(B, .5), t, e.v)),
                part(pads, L, (t, e) => v.pad.triggerAttackRelease(e.n, e.d, t, .4)),
                drumPart(v, B, 4, 8, { kick: [[0, .6], [2.5, .4]], snap: [[1, .4], [3, .45]], hat: [[.5, .35], [1.5, .35], [2, .25], [3.5, .4]] }),
            ];
        });
    }

    function build() {
        if (built) return;
        built = true;
        master = new Tone.Volume(-60).toDestination();
        reverb = new Tone.Reverb({ decay: IS_PHONE ? 2.4 : 3.8, wet: 0.34 })   /* มือถือ: เสียงก้องสั้นลง เบาเครื่อง */.connect(master);
        // เสียงประกอบ
        const fx = new Tone.Volume(-2).connect(reverb);
        inst.sparkle = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 8, modulationIndex: 1.6, envelope: { attack: .002, decay: 1.2, sustain: 0, release: 1.2 } }).connect(fx);
        inst.sparkle.volume.value = -14; inst.sparkle.maxPolyphony = 16;
        inst.noiseFilter = new Tone.Filter(1800, 'bandpass').connect(master);
        inst.noise = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.25, sustain: 0 } }).connect(inst.noiseFilter);
        inst.noise.volume.value = -14;
        inst.thump = new Tone.MembraneSynth({ pitchDecay: .04, octaves: 4, envelope: { attack: .001, decay: .25, sustain: 0 } }).connect(master);
        inst.thump.volume.value = -14;
        inst.blip = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: .002, decay: .12, sustain: 0, release: .05 } }).connect(fx);
        inst.blip.volume.value = -16;
        buildTracks();
    }

    function play(name) {
        const tr = tracks[name];
        if (current === name) return;
        if (!tr) {   // หน้าที่ไม่มีเพลงของตัวเอง (เช่นหน้าแผ่นเสียง) → เฟดเพลงเดิมออกให้เงียบ
            const old = current && tracks[current];
            if (old) { old.bus.volume.rampTo(-60, 1.4); setTimeout(() => { if (current !== name) return; old.parts.forEach(p => p.stop()); old.bus.volume.value = -Infinity; }, 1500); }
            current = name;
            return;
        }
        const old = current && tracks[current];
        if (old) {
            old.bus.volume.rampTo(-60, 1.4);
            setTimeout(() => { if (current !== name) return; old.parts.forEach(p => p.stop()); old.bus.volume.value = -Infinity; }, 1500);
        }
        current = name;
        const at = Tone.getTransport().seconds + 0.05;
        tr.parts.forEach(p => p.start(at));
        tr.bus.volume.value = -40;
        tr.bus.volume.rampTo(0, 1.6);
    }

    function start() {
        if (started) return;
        started = true;
        if (IS_IOS) unlockIOSSilentSwitch();   // ใช้เฉพาะ iPhone (Android ไม่ต้อง และอาจไปแย่งช่องเสียงกับ YouTube)
        // แตะจอทุกครั้ง: ถ้ามือถือพักระบบเสียงไว้ ให้กลับมาทำงาน (การแตะคือจังหวะเดียวที่มือถือยอม)
        ['pointerdown', 'touchend', 'click'].forEach(ev => document.addEventListener(ev, () => {
            const c = Tone.getContext(); if (c.state !== 'running') c.resume().catch(() => {});
        }, true));
        Tone.start().then(() => {
            build();
            Tone.getTransport().start('+0.05');
            master.volume.rampTo(muted ? -Infinity : LEVEL, 2.5);
            setTimeout(() => play(wanted), 80);
        }).catch(() => { started = false; });
    }

    function scene(name) {
        wanted = name;
        if (built) play(name);
    }

    // เตรียมเครื่องดนตรี + เสียงก้องไว้ล่วงหน้าตอนหน้าโหลด (ยังไม่มีเสียง) → กด "พร้อม" แล้วเพลงเริ่มทันที
    function prepare() {
        try {
            build();
            return Promise.resolve(reverb && reverb.ready).catch(() => {});
        } catch (e) {
            return Promise.resolve();
        }
    }

    function toggle() {
        muted = !muted;
        if (master) master.volume.rampTo(muted ? -Infinity : LEVEL, 0.4);
        return muted;
    }

    function fadeOut(ms = 2000) { if (master) master.volume.rampTo(-60, ms / 1000); }

    const SFX_NOTES = ['C7', 'A6', 'F6', 'G6', 'D7'];
    let k = 0;
    const lastAt = {};
    function sfx(kind, n = 0) {
        if (!built || muted) return;
        { const c = Tone.getContext(); if (c.state !== 'running') c.resume().catch(() => {}); }   // มือถือพักระบบเสียงไว้ → ปลุกกลับ
        const now = Tone.getContext().now();
        // เครื่องเสียงเดี่ยว (noise/thump/blip) ห้ามสั่งเวลาซ้ำกัน → เลื่อนไปนิดถ้าชน
        const slot = (key) => { const t = Math.max(now, (lastAt[key] || 0) + .03); lastAt[key] = t; return t; };
        const noise = (freq, decay, dur, vol = -14) => {
            const t = slot('noise');
            inst.noiseFilter.frequency.value = freq; inst.noise.envelope.decay = decay; inst.noise.volume.value = vol;
            inst.noise.triggerAttackRelease(dur, t);
        };
        switch (kind) {
            case 'tink': inst.sparkle.triggerAttackRelease(SFX_NOTES[k++ % SFX_NOTES.length], '16n', now, .9); break;
            case 'chime': ['F6', 'A6', 'C7', 'F7'].forEach((m, i) => inst.sparkle.triggerAttackRelease(m, '8n', now + i * .1, .9)); break;
            case 'blow': noise(900, .6, .6, -10); break;
            case 'rip': noise(3200, .18, .18); setTimeout(() => noise(3600, .14, .12), 120); break;
            case 'paper': noise(2400, .3, .3, -16); break;
            case 'pat': noise(1300, .07, .07, -22); break;                          // ชิ้นกระดาษวางลง
            case 'tap':   // แตะกระดาษข้อความ: เสียงกระดาษชัดๆ + ติ๊งเบาๆ
                noise(1900, .18, .18, -1);
                inst.blip.triggerAttackRelease('E6', .09, slot('blip'), .85);
                break;
            case 'type':   // เสียงพิมพ์ดีดทีละคำ: "ติ๊ก" สั้นแต่ชัด
                noise(3000 + Math.random() * 700, .055, .06, -2);
                break;
            case 'drop':                                                             // การ์ดนับถอยหลังตก + โน้ตไต่ขึ้น
                inst.thump.triggerAttackRelease('C2', '8n', slot('thump'));
                noise(1600, .12, .12, -16);
                inst.sparkle.triggerAttackRelease(['C6', 'E6', 'G6'][n % 3], '8n', now + .02, .9);
                break;
            case 'stamp':                                                            // ปั๊ม "เริ่ม!" + พลุกระดาษ
                inst.thump.triggerAttackRelease('G1', '8n', slot('thump'));
                noise(5000, .25, .25, -10);
                ['C6', 'E6', 'G6', 'C7'].forEach((m, i) => inst.sparkle.triggerAttackRelease(m, '8n', now + .08 + i * .07, .9));
                break;
            case 'pop': noise(5200, .2, .2, -11); inst.sparkle.triggerAttackRelease('C7', '16n', now + .05, .8); break;
            case 'hop': inst.blip.triggerAttackRelease(Tone.Frequency('C6').transpose(n).toNote(), .06, slot('blip'), .6); break;   // ดอกไม้กระดึ๊บ
            case 'zip':                                                              // ผูกโบว์
                { const t = slot('blip'); lastAt.blip = t + .3;
                  inst.blip.frequency.cancelScheduledValues(t);
                  inst.blip.triggerAttack('C5', t, .5);
                  inst.blip.frequency.exponentialRampTo(Tone.Frequency('C7').toFrequency(), .25, t);
                  inst.blip.triggerRelease(t + .28); }
                break;
        }
    }

    window.Music = { start, prepare, scene, toggle, fadeOut, sfx, get muted() { return muted; } };
})();
