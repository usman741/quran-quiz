/* Let's Join Quran: Quran games for kids. One game at a time, no sign-up, nothing leaves the page. */
(function () {
	'use strict';
	var root = document.getElementById('ljq-games');
	if (!root) { return; }
	var hub = root.querySelector('.lg-hub');
	var stage = root.querySelector('.lg-stage');
	var play = stage.querySelector('.lg-play');
	var titleEl = stage.querySelector('.lg-stage__title');
	var infoEl = stage.querySelector('.lg-stage__info');
	var barEl = stage.querySelector('.lg-progress i');
	var muteBtn = stage.querySelector('.lg-mute');
	var dataEl = document.getElementById('ljq-games-data');
	var DATA = dataEl ? JSON.parse(dataEl.textContent) : {};

	/* ---------- small helpers ---------- */
	var h = function (tag, cls, html) {
		var el = document.createElement(tag);
		if (cls) { el.className = cls; }
		if (html !== undefined) { el.innerHTML = html; }
		return el;
	};
	var btn = function (cls, html) { var b = h('button', cls, html); b.type = 'button'; return b; };
	var shuffle = function (a) {
		a = a.slice();
		for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
		return a;
	};
	var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
	var store = {
		get: function (k) { try { return window.localStorage.getItem('ljq-games-' + k); } catch (e) { return null; } },
		set: function (k, v) { try { window.localStorage.setItem('ljq-games-' + k, v); } catch (e) { /* private mode */ } }
	};
	/* Hands out items without repeats: every item is used once before any comes back. Remembered between visits. */
	var deck = function (name, list, n) {
		var q = [];
		try { q = JSON.parse(store.get('deck-' + name) || '[]'); } catch (e) { q = []; }
		q = q.filter(function (i) { return i < list.length; });
		var out = [];
		while (out.length < n && list.length) {
			if (!q.length) { q = shuffle(list.map(function (x, i) { return i; })).filter(function (i) { return out.indexOf(list[i]) === -1; }); if (!q.length) { break; } }
			out.push(list[q.shift()]);
		}
		store.set('deck-' + name, JSON.stringify(q));
		return out;
	};
	var ar = function (txt, cls) { return '<span class="lg-ar' + (cls ? ' ' + cls : '') + '" lang="ar" dir="rtl">' + txt + '</span>'; };
	var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

	/* ---------- sounds: short effects made in the browser. No music, no songs, no voices. ---------- */
	var muted = store.get('muted') === '1';
	var actx = null, out = null, noiseBuf = null;
	/* Browsers only allow sound after a tap or click, so the sound engine starts (or wakes up) on the child's first tap. */
	var audio = function () {
		if (actx) {
			if (actx.state === 'suspended') { try { actx.resume(); } catch (e) { /* ignore */ } }
			return actx;
		}
		var AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) { return null; }
		try {
			/* iPhone: play game sounds even when the ring/silent switch is on silent (Safari 17+). */
			try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; } } catch (e) { /* older Safari */ }
			actx = new AC();
			var comp = actx.createDynamicsCompressor();
			out = actx.createGain();
			out.gain.value = 0.9;
			out.connect(comp); comp.connect(actx.destination);
			noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate * 0.6), actx.sampleRate);
			var d = noiseBuf.getChannelData(0);
			for (var i = 0; i < d.length; i++) { d[i] = Math.random() * 2 - 1; }
			/* Older iPhones need one silent sound inside the tap to unlock audio. */
			var s = actx.createBufferSource();
			s.buffer = actx.createBuffer(1, 1, 22050);
			s.connect(actx.destination);
			s.start(0);
			if (actx.state === 'suspended') { actx.resume(); }
		} catch (e) { actx = null; }
		return actx;
	};
	var unlock = function () { if (!muted) { audio(); } };
	['pointerup', 'touchend', 'click', 'keydown'].forEach(function (ev) { root.addEventListener(ev, unlock, { passive: true }); });

	/* One note: freq, start delay, length, wave, volume, optional slide to freq2. */
	var tone = function (freq, at, len, type, vol, freq2) {
		if (muted) { return; }
		var c = audio();
		if (!c) { return; }
		try {
			var t = c.currentTime + (at || 0);
			var o = c.createOscillator();
			var g = c.createGain();
			o.type = type || 'sine';
			o.frequency.setValueAtTime(freq, t);
			if (freq2) { o.frequency.exponentialRampToValueAtTime(freq2, t + len); }
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.008);
			g.gain.exponentialRampToValueAtTime(0.0001, t + len);
			o.connect(g); g.connect(out);
			o.start(t); o.stop(t + len + 0.03);
		} catch (e) { /* no audio */ }
	};
	/* A short burst of filtered noise: pops, swishes, puffs. */
	var noise = function (at, len, vol, ftype, freq, freq2) {
		if (muted) { return; }
		var c = audio();
		if (!c || !noiseBuf) { return; }
		try {
			var t = c.currentTime + (at || 0);
			var s = c.createBufferSource();
			s.buffer = noiseBuf;
			var f = c.createBiquadFilter();
			f.type = ftype || 'bandpass';
			f.frequency.setValueAtTime(freq || 2000, t);
			if (freq2) { f.frequency.exponentialRampToValueAtTime(freq2, t + len); }
			f.Q.value = f.type === 'bandpass' ? 1.4 : 0.7;
			var g = c.createGain();
			g.gain.setValueAtTime(vol || 0.3, t);
			g.gain.exponentialRampToValueAtTime(0.0001, t + len);
			s.connect(f); f.connect(g); g.connect(out);
			s.start(t); s.stop(t + len + 0.03);
		} catch (e) { /* no audio */ }
	};
	/* A soft car engine for Quiz Race. */
	var engine = function (len) {
		if (muted) { return; }
		var c = audio();
		if (!c) { return; }
		try {
			var t = c.currentTime;
			var o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
			o.type = 'sawtooth';
			o.frequency.setValueAtTime(70, t);
			o.frequency.exponentialRampToValueAtTime(190, t + len * 0.7);
			o.frequency.exponentialRampToValueAtTime(140, t + len);
			f.type = 'lowpass'; f.frequency.value = 700;
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.28, t + 0.05);
			g.gain.exponentialRampToValueAtTime(0.0001, t + len);
			o.connect(f); f.connect(g); g.connect(out);
			o.start(t); o.stop(t + len + 0.03);
		} catch (e) { /* no audio */ }
	};
	var sfx = {
		/* right answer: a small bell */
		ok: function () { tone(880, 0, 0.35, 'sine', 0.24); tone(1320, 0.07, 0.4, 'sine', 0.15); tone(2640, 0.07, 0.2, 'sine', 0.04); },
		/* wrong answer: a soft "uh-oh", never harsh */
		no: function () { tone(330, 0, 0.17, 'triangle', 0.22, 250); tone(247, 0.15, 0.24, 'triangle', 0.2, 185); },
		/* balloon pop */
		pop: function () { noise(0, 0.08, 0.6, 'highpass', 1500); tone(600, 0, 0.09, 'sine', 0.28, 160); },
		/* sparkle: streaks, star balloons, finished rounds */
		bonus: function () { [1047, 1319, 1568, 2093].forEach(function (f, i) { tone(f, i * 0.06, 0.22, 'sine', 0.16); }); },
		/* end of game with 2 or 3 stars */
		win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.3, 'triangle', 0.22); }); [1568, 2093, 2637].forEach(function (f, i) { tone(f, 0.5 + i * 0.05, 0.5, 'sine', 0.08); }); },
		/* game starts: a soft whoosh */
		go: function () { noise(0, 0.35, 0.18, 'bandpass', 400, 3000); tone(440, 0.05, 0.18, 'sine', 0.12, 880); },
		/* the letter to find changes */
		target: function () { tone(659, 0, 0.12, 'sine', 0.14); tone(988, 0.09, 0.18, 'sine', 0.14); },
		/* card turns over */
		flip: function () { noise(0, 0.07, 0.3, 'bandpass', 3200, 1200); },
		/* two cards match */
		match: function () { tone(784, 0, 0.25, 'sine', 0.22); tone(1175, 0.09, 0.35, 'sine', 0.2); },
		/* a letter peeks out of its hole */
		peek: function () { tone(300, 0, 0.1, 'sine', 0.07, 560); },
		/* tapping the right letter in Letter Pop-Up: a wooden "tok" */
		tok: function () { tone(190, 0, 0.12, 'sine', 0.35, 95); noise(0, 0.03, 0.25, 'bandpass', 1800); tone(820, 0, 0.05, 'triangle', 0.1); },
		/* train carriage joins: chug-chug */
		chug: function () { noise(0, 0.07, 0.35, 'bandpass', 700); noise(0.11, 0.07, 0.28, 'bandpass', 600); },
		/* train is complete: two toots of the whistle */
		toot: function () { [0, 0.32].forEach(function (at) { tone(587, at, 0.26, 'sine', 0.16); tone(740, at, 0.26, 'sine', 0.13); tone(880, at, 0.26, 'triangle', 0.05); }); },
		/* Wudu Steps: a water drop */
		drop: function () { tone(500, 0, 0.13, 'sine', 0.3, 1500); tone(1200, 0.05, 0.08, 'sine', 0.06, 2000); },
		/* Quiz Race: the car moves */
		vroom: function () { engine(0.55); },
		/* last seconds of a timed game */
		tick: function () { tone(1250, 0, 0.04, 'square', 0.05); },
		/* small buttons */
		click: function () { tone(1000, 0, 0.04, 'sine', 0.1); }
	};
	var paintMute = function () {
		muteBtn.setAttribute('aria-pressed', String(muted));
		muteBtn.querySelector('span').textContent = muted ? 'Sound off' : 'Sound on';
		muteBtn.classList.toggle('is-off', muted);
	};
	muteBtn.addEventListener('click', function () { muted = !muted; store.set('muted', muted ? '1' : '0'); paintMute(); if (!muted) { sfx.click(); } });
	paintMute();
	/* Counts down the last 5 seconds of a timed game with a soft tick. */
	var lastTick = 0;
	var countdown = function (timeLeft) {
		var s = Math.ceil(timeLeft);
		if (s <= 5 && s >= 1 && s !== lastTick) { lastTick = s; sfx.tick(); }
		if (s > 5) { lastTick = 0; }
	};

	/* ---------- letters (Noorani Qaida order and names) ---------- */
	var LETTERS = [
		['ا', 'Alif', 0, ''], ['ب', 'Ba', 1, 'below'], ['ت', 'Ta', 2, 'above'], ['ث', 'Saa', 3, 'above'], ['ج', 'Jeem', 1, 'below'],
		['ح', 'Ha', 0, ''], ['خ', 'Kha', 1, 'above'], ['د', 'Daal', 0, ''], ['ذ', 'Zaal', 1, 'above'], ['ر', 'Raa', 0, ''],
		['ز', 'Zaa', 1, 'above'], ['س', 'Seen', 0, ''], ['ش', 'Sheen', 3, 'above'], ['ص', 'Suaad', 0, ''], ['ض', 'Duaad', 1, 'above'],
		['ط', 'Tuaa', 0, ''], ['ظ', 'Zuaa', 1, 'above'], ['ع', 'Ain', 0, ''], ['غ', 'Ghain', 1, 'above'], ['ف', 'Fa', 1, 'above'],
		['ق', 'Qaaf', 2, 'above'], ['ك', 'Kaaf', 0, ''], ['ل', 'Laam', 0, ''], ['م', 'Meem', 0, ''], ['ن', 'Noon', 1, 'above'],
		['و', 'Waw', 0, ''], ['ه', 'Ha', 0, ''], ['ء', 'Hamza', 0, ''], ['ی', 'Ya', 0, '']
	];
	var L = {};
	LETTERS.forEach(function (l) { L[l[0]] = l; });
	var FAMILIES = ['بتثن', 'جحخ', 'دذ', 'رز', 'سش', 'صض', 'طظ', 'عغ', 'فق', 'كل'];
	var familyOf = function (ch) {
		for (var i = 0; i < FAMILIES.length; i++) { if (FAMILIES[i].indexOf(ch) !== -1) { return FAMILIES[i].split('').filter(function (c) { return c !== ch; }); } }
		return [];
	};
	var lookAlike = function (ch) {
		var f = familyOf(ch);
		return f.length ? L[pick(f)] : pick(LETTERS.filter(function (l) { return l[0] !== ch; }));
	};
	var HEAVY = 'خصضغطقظ';
	var COLORS = ['#E8593C', '#F5B82E', '#12594F', '#2F80C9', '#8E4FC2', '#E0457B', '#1C9E7C'];
	var tapLetters = LETTERS.filter(function (l) { return l[0] !== 'ء'; });
	/* Letter groups in Qaida order, four letters each, so beginners practise only what they have learnt. */
	var GROUPS = [];
	for (var gi = 0; gi < tapLetters.length; gi += 4) { GROUPS.push(tapLetters.slice(gi, gi + 4)); }
	var groupOf = function (id) {
		var g = store.get('group-' + id);
		var n = parseInt(g, 10);
		return (n >= 1 && n <= GROUPS.length) ? n : 0;
	};
	var poolFor = function (id) { var n = groupOf(id); return n ? GROUPS[n - 1] : tapLetters; };
	/* A letter from the pool that is not ch; on Hard, a look-alike from the pool when there is one. */
	var otherFrom = function (pool, ch, alike) {
		var rest = pool.filter(function (p) { return p[0] !== ch; });
		if (alike) {
			var fam = familyOf(ch);
			var near = rest.filter(function (p) { return fam.indexOf(p[0]) !== -1; });
			if (pool === tapLetters) { return lookAlike(ch); }
			if (near.length && Math.random() < 0.7) { return pick(near); }
		}
		return pick(rest);
	};

	/* ---------- results, stars, confetti, cheers ---------- */
	var best = function (id) { return parseInt(store.get('best-' + id) || '0', 10) || 0; };
	var level = function (id) { return store.get('level-' + id) === 'hard' ? 'hard' : 'easy'; };
	var starRow = function (n) {
		var s = '';
		for (var i = 1; i <= 3; i++) { s += '<i class="lg-star' + (i <= n ? ' is-on' : '') + '" aria-hidden="true"></i>'; }
		return '<span class="lg-stars" role="img" aria-label="' + n + ' out of 3 stars">' + s + '</span>';
	};
	var confetti = function () {
		var box = h('div', 'lg-confetti');
		for (var i = 0; i < 50; i++) {
			var p = h('i');
			p.style.left = (Math.random() * 100) + '%';
			p.style.background = pick(COLORS);
			p.style.animationDelay = (Math.random() * 0.6) + 's';
			p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
			box.appendChild(p);
		}
		stage.appendChild(box);
		setTimeout(function () { box.remove(); }, 3400);
	};
	var floatText = function (target, txt, cls) {
		var r = target.getBoundingClientRect(), s = stage.getBoundingClientRect();
		var f = h('span', 'lg-float' + (cls ? ' ' + cls : ''), txt);
		f.style.left = (r.left - s.left + r.width / 2) + 'px';
		f.style.top = (r.top - s.top) + 'px';
		stage.appendChild(f);
		setTimeout(function () { f.remove(); }, 900);
	};
	var CHEERS = ['', '', '', 'Three in a row!', '', 'Five in a row!', '', 'Seven in a row!', '', '', 'Ten in a row! Amazing!'];
	var cheer = function (streak) {
		var t = CHEERS[streak];
		if (!t) { return; }
		var c = h('div', 'lg-cheer', t);
		stage.appendChild(c);
		sfx.bonus();
		setTimeout(function () { c.remove(); }, 1300);
	};
	var info = function (txt) { infoEl.textContent = txt; };
	var progress = function (p) { barEl.style.width = Math.max(0, Math.min(100, p * 100)) + '%'; };
	var shake = function (el) { el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake'); try { if (navigator.vibrate) { navigator.vibrate(60); } } catch (e) { /* no vibration */ } };
	var byScore = function (r, n) { var p = r / n; return p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.4 ? 1 : 0; };

	var GAMES = {};
	var ORDER = [];
	var current = null, stop = null;

	var finish = function (id, stars, line) {
		var prev = best(id);
		var isBest = stars > prev && stars > 0;
		if (stars > prev) { store.set('best-' + id, String(stars)); }
		paintHub();
		progress(1);
		var title = ['Keep practising!', 'Well done!', 'Great work!', 'MashaAllah, brilliant!'][stars];
		play.innerHTML = '';
		var card = h('div', 'lg-result');
		var cup = stars === 3 ? 'gold' : stars === 2 ? 'silver' : stars === 1 ? 'bronze' : 'try';
		card.innerHTML = '<span class="lg-cup lg-cup--' + cup + '" aria-hidden="true"><i></i><b></b></span>' + (isBest ? '<span class="lg-newbest">New best!</span>' : '') + starRow(stars) + '<h3>' + title + '</h3><p>' + line + '</p>';
		var row = h('div', 'lg-result__btns');
		var again = btn('ljq-btn ljq-btn--dark', 'Play again');
		again.addEventListener('click', function () { start(id); });
		row.appendChild(again);
		var others = ORDER.filter(function (g) { return g !== id; });
		var nextId = others.filter(function (g) { return !best(g); })[0] || pick(others);
		var nx = btn('ljq-btn ljq-btn--ghost-dark', 'Next: ' + GAMES[nextId].title);
		nx.addEventListener('click', function () { open(nextId, true); });
		row.appendChild(nx);
		card.appendChild(row);
		var all = btn('lg-linkbtn', 'All games');
		all.addEventListener('click', function () { close(true); });
		card.appendChild(all);
		play.appendChild(card);
		if (stars >= 2) { sfx.win(); confetti(); } else { sfx.ok(); }
		again.focus({ preventScroll: true });
	};

	/* A multiple-choice round runner used by most games. */
	var quiz = function (id, rounds, build, scoreLine, starsFor) {
		var i = 0, right = 0, streak = 0;
		var next = function () {
			progress(i / rounds.length);
			if (i >= rounds.length) { finish(id, starsFor(right, rounds.length), scoreLine(right, rounds.length)); return; }
			info('Question ' + (i + 1) + ' of ' + rounds.length + '  ·  Correct: ' + right);
			var q = build(rounds[i], i);
			play.innerHTML = '';
			var box = h('div', 'lg-q');
			box.appendChild(h('p', 'lg-q__ask', q.ask));
			if (q.show) { box.appendChild(h('div', 'lg-q__show' + (q.showCls ? ' ' + q.showCls : ''), q.show)); }
			var opts = h('div', 'lg-opts' + (q.cls ? ' ' + q.cls : ''));
			var locked = false;
			q.options.forEach(function (o, k) {
				var b = btn('lg-opt', o.html);
				if (o.label) { b.setAttribute('aria-label', o.label); }
				b.addEventListener('click', function () {
					if (locked) { return; }
					locked = true;
					if (o.ok) {
						right++; streak++; b.classList.add('is-right'); sfx.ok(); floatText(b, '+1'); cheer(streak);
					} else {
						streak = 0; b.classList.add('is-wrong'); shake(b); sfx.no();
						Array.prototype.forEach.call(opts.children, function (c, j) { if (q.options[j].ok) { c.classList.add('is-right'); } });
						if (q.after) { box.appendChild(h('p', 'lg-q__tip', q.after)); }
					}
					if (q.onAnswer) { q.onAnswer(o.ok, right); }
					setTimeout(function () { i++; next(); }, o.ok ? 800 : 1900);
				});
				opts.appendChild(b);
			});
			box.appendChild(opts);
			play.appendChild(box);
		};
		next();
	};

	/* Tap-in-order runner: Letter Train, Wudu Steps, Salah Steps. */
	var orderGame = function (id, rounds, opts) {
		var round = 0, mistakes = 0;
		var go = function () {
			progress(round / rounds.length);
			if (round >= rounds.length) {
				finish(id, mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1, opts.done(rounds.length, mistakes));
				return;
			}
			var r = rounds[round];
			var nextI = 0;
			play.innerHTML = '';
			var wrap = h('div', 'lg-order' + (opts.cls ? ' ' + opts.cls : ''));
			wrap.appendChild(h('p', 'lg-q__ask', r.ask));
			var shelf = opts.shelf();
			wrap.appendChild(shelf.el);
			var grid = h('div', opts.gridCls);
			shuffle(r.items.map(function (x, k) { return [x, k]; })).forEach(function (pair) {
				var b = btn('lg-opt', opts.render(pair[0]));
				if (opts.label) { b.setAttribute('aria-label', opts.label(pair[0])); }
				b.addEventListener('click', function () {
					if (b.disabled) { return; }
					if (pair[1] === nextI) {
						nextI++; b.disabled = true; b.classList.add('is-right'); (opts.okSfx || sfx.ok)();
						shelf.add(pair[0], nextI);
						if (nextI === r.items.length) { wrap.classList.add('is-go'); setTimeout(opts.doneSfx || sfx.bonus, 250); round++; setTimeout(go, 1500); }
					} else { mistakes++; shake(b); sfx.no(); if (opts.hint) { opts.hint(wrap, r.items[nextI]); } }
					info((opts.unit || 'Round') + ' ' + Math.min(round + 1, rounds.length) + ' of ' + rounds.length + '  ·  Mistakes: ' + mistakes);
				});
				grid.appendChild(b);
			});
			wrap.appendChild(grid);
			play.appendChild(wrap);
			info((opts.unit || 'Round') + ' ' + (round + 1) + ' of ' + rounds.length + '  ·  Mistakes: ' + mistakes);
		};
		go();
	};

	/* Timed tapping runner: Balloon Pop and Whack-a-Letter share the target banner and scoring. */
	var targetBanner = function (box) {
		var banner = h('div', 'lg-target');
		box.appendChild(banner);
		var firstSet = true;
		return {
			set: function (l, verb) {
				if (!firstSet) { sfx.target(); }
				firstSet = false;
				banner.innerHTML = '<small>' + verb + '</small>' + ar(l[0], 'lg-target__big') + '<em>' + l[1] + '</em>';
				banner.classList.remove('is-new'); void banner.offsetWidth; banner.classList.add('is-new');
			}
		};
	};

	/* ---------- 1. Balloon Pop ---------- */
	GAMES['balloon-pop'] = { title: 'Balloon Pop', cat: 'letters', levels: true, groups: true, how: 'A letter is shown at the top. Pop every balloon with that letter before it flies away. Golden star balloons give 3 points.', run: function (id, lv) {
		var hard = lv === 'hard';
		var pool = poolFor(id);
		var area = h('div', 'lg-sky');
		play.innerHTML = '';
		play.appendChild(area);
		var banner = targetBanner(area);
		var target, score = 0, missed = 0, sinceChange = 0, targetAge = 0, total = hard ? 50 : 45, timeLeft = total, alive = [], last = 0, spawnT = 0, raf = 0, running = true;
		var setTarget = function () {
			var t;
			do { t = pick(pool); } while (target && t[0] === target[0]);
			target = t; sinceChange = 0; targetAge = 0;
			banner.set(target, 'Pop every');
		};
		/* Each letter is on screen only once at a time, so a child looks for one balloon, not five. */
		var onScreen = function (ch) { return alive.some(function (a) { return !a.star && a.l[0] === ch; }); };
		var spawn = function () {
			var star = Math.random() < 0.06 && !alive.some(function (a) { return a.star; });
			var l = null;
			if (!star) {
				if (!onScreen(target[0]) && Math.random() < (hard ? 0.6 : 0.75)) {
					l = target;
				} else {
					var free = pool.filter(function (p) { return p[0] !== target[0] && !onScreen(p[0]); });
					if (!free.length) { return false; }
					var fam = familyOf(target[0]);
					var near = free.filter(function (p) { return fam.indexOf(p[0]) !== -1; });
					l = hard && near.length && Math.random() < 0.6 ? pick(near) : pick(free);
				}
			}
			var b = btn('lg-balloon' + (star ? ' lg-balloon--star' : ''), star ? '<span class="lg-balloon__star" aria-hidden="true"></span>' : ar(l[0]));
			b.setAttribute('aria-label', star ? 'Star balloon' : 'Balloon ' + l[1]);
			b.style.setProperty('--c', star ? '#F5B82E' : pick(COLORS));
			var w = area.clientWidth;
			var size = w < 500 ? 64 : 78;
			var x = 8 + Math.random() * Math.max(10, w - size - 16);
			var speed = (area.clientHeight / (w < 500 ? 6.2 : 7)) * (hard ? 1.25 : 0.95) * (0.85 + Math.random() * 0.35);
			var o = { el: b, l: l, star: star, x: x, y: area.clientHeight + 10, v: star ? speed * 1.3 : speed, sway: Math.random() * 6.28 };
			b.style.left = x + 'px';
			b.addEventListener('pointerdown', function (e) {
				e.preventDefault();
				if (!running || b.classList.contains('is-pop')) { return; }
				if (o.star || o.l[0] === target[0]) {
					var pts = o.star ? 3 : 1;
					score += pts; b.classList.add('is-pop'); floatText(b, '+' + pts, o.star ? 'is-gold' : '');
					sfx.pop();
					if (o.star) { sfx.bonus(); } else { sinceChange++; }
					setTimeout(function () { b.remove(); }, 260);
					alive = alive.filter(function (a) { return a !== o; });
					/* A new letter after 2 pops, so the letter at the top keeps changing. */
					if (sinceChange >= 2) { setTarget(); }
					if (!o.star) { spawnT = Math.min(spawnT, 0.35); }
				} else { missed++; shake(b); sfx.no(); }
			});
			area.appendChild(b);
			alive.push(o);
			return true;
		};
		var tick = function (t) {
			if (!running) { return; }
			var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
			last = t;
			timeLeft -= dt;
			targetAge += dt;
			if (targetAge > 9) { setTarget(); }
			spawnT -= dt;
			if (spawnT <= 0) { spawnT = spawn() === false ? 0.3 : (hard ? 0.6 : 0.8) + Math.random() * 0.45; }
			alive = alive.filter(function (o) {
				o.y -= o.v * dt; o.sway += dt * 2;
				o.el.style.transform = 'translate(' + (Math.sin(o.sway) * 8) + 'px,' + o.y + 'px)';
				if (o.y < -110) { o.el.remove(); return false; }
				return true;
			});
			info('Time: ' + Math.max(0, Math.ceil(timeLeft)) + 's  ·  Points: ' + score);
			progress(1 - timeLeft / total);
			countdown(timeLeft);
			if (timeLeft <= 0) {
				running = false;
				var goal = hard ? 16 : 12;
				var s = score >= goal ? 3 : score >= goal * 0.6 ? 2 : score >= goal * 0.27 ? 1 : 0;
				finish(id, s, 'You scored ' + score + ' points' + (missed ? ' and tapped ' + missed + ' wrong balloon' + (missed === 1 ? '' : 's') : '') + '.');
				return;
			}
			raf = requestAnimationFrame(tick);
		};
		setTarget();
		raf = requestAnimationFrame(tick);
		return function () { running = false; cancelAnimationFrame(raf); };
	} };

	/* ---------- 2. Whack-a-Letter ---------- */
	GAMES['whack-a-letter'] = { title: 'Letter Pop-Up', cat: 'letters', levels: true, groups: true, how: 'Letters pop up from the holes. Tap the letter shown at the top before it hides again.', run: function (id, lv) {
		var hard = lv === 'hard';
		var pool = poolFor(id);
		play.innerHTML = '';
		var field = h('div', 'lg-whack');
		var banner = targetBanner(field);
		var grid = h('div', 'lg-whack__grid');
		var holes = [];
		for (var k = 0; k < 9; k++) {
			var hole = h('div', 'lg-hole');
			var mole = btn('lg-mole', '');
			mole.tabIndex = -1;
			hole.appendChild(mole);
			grid.appendChild(hole);
			holes.push({ hole: hole, mole: mole, l: null, up: false, t: 0 });
		}
		field.appendChild(grid);
		play.appendChild(field);
		var target, score = 0, missed = 0, since = 0, total = 45, timeLeft = total, last = 0, spawnT = 0.5, raf = 0, running = true;
		/* How long a letter stays up, in seconds. Slower than before, so children have time to read it. */
		var stay = hard ? 1.7 : 2.5;
		var setTarget = function () { var t; do { t = pick(pool); } while (target && t[0] === target[0]); target = t; since = 0; banner.set(target, 'Tap every'); };
		var hide = function (o) { o.up = false; o.hole.classList.remove('is-up'); o.mole.tabIndex = -1; };
		holes.forEach(function (o) {
			o.mole.addEventListener('pointerdown', function (e) {
				e.preventDefault();
				if (!running || !o.up) { return; }
				if (o.l[0] === target[0]) {
					score++; since++; sfx.tok(); floatText(o.mole, '+1'); o.hole.classList.add('is-hit');
					setTimeout(function () { o.hole.classList.remove('is-hit'); }, 300);
					hide(o);
					if (since >= 5) { setTarget(); }
				} else { missed++; shake(o.mole); sfx.no(); }
			});
		});
		var tick = function (t) {
			if (!running) { return; }
			var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
			last = t; timeLeft -= dt; spawnT -= dt;
			holes.forEach(function (o) { if (o.up) { o.t -= dt; if (o.t <= 0) { hide(o); } } });
			if (spawnT <= 0) {
				var free = holes.filter(function (o) { return !o.up; });
				/* Each letter shows in one hole at a time, never in two or three at once. */
				var up = holes.filter(function (x) { return x.up; }).map(function (x) { return x.l[0]; });
				var spare = pool.filter(function (x) { return x[0] !== target[0] && up.indexOf(x[0]) === -1; });
				var wantT = up.indexOf(target[0]) === -1 && (Math.random() < 0.6 || !spare.length);
				if (free.length && (wantT || spare.length)) {
					var o = pick(free);
					if (wantT) { o.l = target; } else {
						var fam = familyOf(target[0]);
						var near = spare.filter(function (x) { return fam.indexOf(x[0]) !== -1; });
						o.l = hard && near.length && Math.random() < 0.6 ? pick(near) : pick(spare);
					}
					o.mole.innerHTML = ar(o.l[0]);
					o.mole.setAttribute('aria-label', o.l[1]);
					o.mole.style.setProperty('--c', pick(COLORS));
					o.up = true; o.t = stay; o.hole.classList.add('is-up'); o.mole.tabIndex = 0; sfx.peek();
				}
				spawnT = (hard ? 0.9 : 1.2) + Math.random() * 0.5;
			}
			info('Time: ' + Math.max(0, Math.ceil(timeLeft)) + 's  ·  Points: ' + score);
			progress(1 - timeLeft / total);
			countdown(timeLeft);
			if (timeLeft <= 0) {
				running = false;
				var goal = hard ? 13 : 10;
				finish(id, score >= goal ? 3 : score >= goal * 0.6 ? 2 : score >= goal * 0.3 ? 1 : 0, 'You tapped ' + score + ' correct letters' + (missed ? ' and ' + missed + ' wrong ones' : '') + '.');
				return;
			}
			raf = requestAnimationFrame(tick);
		};
		setTarget();
		raf = requestAnimationFrame(tick);
		return function () { running = false; cancelAnimationFrame(raf); };
	} };

	/* ---------- 3. Memory Cards ---------- */
	GAMES['memory-cards'] = { title: 'Memory Cards', cat: 'letters', levels: true, how: 'Turn over two cards at a time. Find each Arabic letter and the card with its name.', run: function (id, lv) {
		var pairs = lv === 'hard' ? 8 : 6;
		var set = shuffle(tapLetters), chosen = [], names = {};
		set.forEach(function (l) { if (chosen.length < pairs && !names[l[1]]) { names[l[1]] = 1; chosen.push(l); } });
		var cards = [];
		chosen.forEach(function (l, k) { cards.push({ k: k, face: ar(l[0], 'lg-card__ar') }); cards.push({ k: k, face: '<span class="lg-card__en">' + l[1] + '</span>' }); });
		cards = shuffle(cards);
		play.innerHTML = '';
		var grid = h('div', 'lg-memory' + (pairs > 6 ? ' lg-memory--8' : ''));
		var open1 = null, busy = false, moves = 0, found = 0;
		info('Moves: 0  ·  Pairs: 0 of ' + pairs);
		progress(0);
		cards.forEach(function (c) {
			var b = btn('lg-mcard', '<span class="lg-mcard__in"><span class="lg-mcard__back" aria-hidden="true"></span><span class="lg-mcard__face">' + c.face + '</span></span>');
			b.setAttribute('aria-label', 'Hidden card');
			b.addEventListener('click', function () {
				if (busy || b.classList.contains('is-open')) { return; }
				b.classList.add('is-open');
				sfx.flip();
				b.setAttribute('aria-label', b.textContent);
				if (!open1) { open1 = { b: b, c: c }; return; }
				moves++;
				if (open1.c.k === c.k) {
					open1.b.classList.add('is-done'); b.classList.add('is-done'); setTimeout(sfx.match, 120); found++; floatText(b, '+1'); open1 = null;
					progress(found / pairs);
					if (found === pairs) {
						var good = pairs + 3;
						setTimeout(function () { finish(id, moves <= good ? 3 : moves <= good + 5 ? 2 : 1, 'You found all ' + found + ' pairs in ' + moves + ' moves.'); }, 650);
					}
				} else {
					busy = true; setTimeout(sfx.no, 250);
					var a = open1; open1 = null;
					setTimeout(function () { a.b.classList.remove('is-open'); b.classList.remove('is-open'); a.b.setAttribute('aria-label', 'Hidden card'); b.setAttribute('aria-label', 'Hidden card'); busy = false; }, 900);
				}
				info('Moves: ' + moves + '  ·  Pairs: ' + found + ' of ' + pairs);
			});
			grid.appendChild(b);
		});
		play.appendChild(grid);
	} };

	/* ---------- 4. Letter Train ---------- */
	GAMES['letter-train'] = { title: 'Letter Train', cat: 'letters', levels: true, how: 'Tap the letters in the order of the Qaida. Each right letter adds a carriage to the train.', run: function (id, lv) {
		var len = lv === 'hard' ? 8 : 5;
		var rounds = [];
		for (var r = 0; r < 3; r++) {
			var s = Math.floor(Math.random() * (LETTERS.length - len + 1));
			var run = LETTERS.slice(s, s + len);
			rounds.push({ items: run, ask: 'Tap the letters in Qaida order, starting with ' + ar(run[0][0]) + ' <b>' + run[0][1] + '</b>' });
		}
		orderGame(id, rounds, {
			cls: 'lg-train', unit: 'Train', gridCls: 'lg-opts lg-opts--letters', okSfx: sfx.chug, doneSfx: sfx.toot,
			render: function (l) { return ar(l[0], 'lg-opt__ar'); }, label: function (l) { return l[1]; },
			shelf: function () {
				var track = h('div', 'lg-train__track');
				track.appendChild(h('span', 'lg-train__engine', '<i></i>'));
				var cars = h('div', 'lg-train__cars');
				track.appendChild(cars);
				return { el: track, add: function (l, n) { var c = h('span', 'lg-train__car', ar(l[0])); c.style.setProperty('--c', COLORS[n % COLORS.length]); cars.appendChild(c); } };
			},
			done: function (n, m) { return 'You built ' + n + ' trains with ' + m + (m === 1 ? ' mistake.' : ' mistakes.'); }
		});
	} };

	/* ---------- 5. Missing Letter ---------- */
	GAMES['missing-letter'] = { title: 'Missing Letter', cat: 'letters', levels: true, how: 'One letter is missing from the row. Find the letter that fits in the gap.', run: function (id, lv) {
		var hard = lv === 'hard';
		var rounds = [];
		for (var i = 0; i < 10; i++) { rounds.push(Math.floor(Math.random() * (LETTERS.length - 4))); }
		quiz(id, rounds, function (s) {
			var row = LETTERS.slice(s, s + 5);
			var gap = 1 + Math.floor(Math.random() * 3);
			var ans = row[gap];
			var html = '<span class="lg-row" dir="rtl">' + row.map(function (l, k) { return k === gap ? '<b class="lg-row__gap">?</b>' : '<b>' + ar(l[0]) + '</b>'; }).join('') + '</span>';
			var opts = [ans];
			var pool = hard ? familyOf(ans[0]).map(function (c) { return L[c]; }).concat(shuffle(LETTERS)) : shuffle(LETTERS);
			pool.forEach(function (l) { if (opts.length < (hard ? 4 : 3) && opts.indexOf(l) === -1 && row.indexOf(l) === -1) { opts.push(l); } });
			return { ask: 'Which letter is missing?', show: html, showCls: 'lg-q__show--row', cls: 'lg-opts--letters', options: shuffle(opts).map(function (l) { return { html: ar(l[0], 'lg-opt__ar'), label: l[1], ok: l === ans }; }), after: 'The missing letter is ' + ar(ans[0]) + ' ' + ans[1] + '.' };
		}, function (r, n) { return 'You found ' + r + ' out of ' + n + ' missing letters.'; }, byScore);
	} };

	/* ---------- 6. Odd One Out ---------- */
	GAMES['odd-one-out'] = { title: 'Odd One Out', cat: 'letters', levels: true, how: 'All the letters look the same except one. Find the letter that is different.', run: function (id, lv) {
		var n = lv === 'hard' ? 6 : 4;
		var withFamily = LETTERS.filter(function (l) { return familyOf(l[0]).length; });
		var rounds = shuffle(withFamily).slice(0, 10);
		quiz(id, rounds, function (l) {
			var odd = L[pick(familyOf(l[0]))];
			var cells = [];
			for (var k = 0; k < n - 1; k++) { cells.push(l); }
			cells.push(odd);
			return { ask: 'Tap the letter that is <strong>different</strong>', cls: n > 4 ? 'lg-opts--letters lg-opts--six' : 'lg-opts--letters lg-opts--four', options: shuffle(cells).map(function (c) { return { html: ar(c[0], 'lg-opt__ar'), label: c[1], ok: c === odd }; }), after: 'The different letter was ' + ar(odd[0]) + ' ' + odd[1] + '.' };
		}, function (r, m) { return 'You spotted ' + r + ' out of ' + m + ' odd letters.'; }, byScore);
	} };

	/* ---------- 7. Dot Detective ---------- */
	var dotText = function (l) { return l[2] === 0 ? 'no dots' : l[2] + (l[2] === 1 ? ' dot ' : ' dots ') + l[3]; };
	GAMES['dot-detective'] = { title: 'Dot Detective', cat: 'letters', levels: false, how: 'Look closely at the dots. How many are there, and are they above or below the letter?', run: function (id) {
		var dotted = LETTERS.filter(function (l) { return 'بتثجخذزشضظغفقن'.indexOf(l[0]) !== -1; });
		quiz(id, shuffle(dotted).slice(0, 10), function (l) {
			if (Math.random() < 0.5) {
				var opts = [l], seen = {}; seen[dotText(l)] = 1;
				shuffle(tapLetters).forEach(function (x) { if (opts.length < 4 && !seen[dotText(x)]) { seen[dotText(x)] = 1; opts.push(x); } });
				return { ask: 'Find the letter with <strong>' + dotText(l) + '</strong>', cls: 'lg-opts--letters lg-opts--four', options: shuffle(opts).map(function (x) { return { html: ar(x[0], 'lg-opt__ar'), label: x[1], ok: x === l }; }) };
			}
			return {
				ask: 'How many dots does this letter have?', show: ar(l[0], 'lg-q__big'),
				options: [0, 1, 2, 3].map(function (n) { return { html: '<span class="lg-dots">' + new Array(n + 1).join('<i></i>') + '</span>' + (n === 0 ? 'None' : n), ok: n === l[2] }; })
			};
		}, function (r, n) { return 'You got ' + r + ' out of ' + n + ' right.'; }, byScore);
	} };

	/* ---------- 8. Harakat Hero ---------- */
	var MARKS = [
		['َ', 'Zabar'], ['ِ', 'Zer'], ['ُ', 'Pesh'], ['ً', 'Do Zabar'], ['ٍ', 'Do Zer'], ['ٌ', 'Do Pesh'],
		['ْ', 'Jazm'], ['َّ', 'Shad'], ['ٰ', 'Khari Zabar'], ['ٖ', 'Khari Zer'], ['ٗ', 'Ulta Pesh']
	];
	GAMES['harakat-hero'] = { title: 'Harakat Hero', cat: 'qaida', levels: true, how: 'A letter has a mark on it. Choose the name of the mark. Easy: Zabar, Zer, Pesh. Hard: all the Qaida marks.', run: function (id, lv) {
		var marks = lv === 'hard' ? MARKS : MARKS.slice(0, 3);
		var base = LETTERS.filter(function (l) { return 'اءی'.indexOf(l[0]) === -1; });
		var rounds = [];
		for (var i = 0; i < 10; i++) { rounds.push({ l: pick(base), m: pick(marks) }); }
		quiz(id, rounds, function (r) {
			var opts = [r.m];
			shuffle(marks).forEach(function (m) { if (opts.length < Math.min(4, marks.length) && m !== r.m) { opts.push(m); } });
			return { ask: 'What is the name of this mark?', show: ar(r.l[0] + r.m[0], 'lg-q__big'), cls: opts.length === 3 ? 'lg-opts--three' : '', options: shuffle(opts).map(function (m) { return { html: m[1], ok: m === r.m }; }) };
		}, function (r, n) { return 'You named ' + r + ' out of ' + n + ' marks.'; }, byScore);
	} };

	/* ---------- 9. Heavy or Light ---------- */
	GAMES['heavy-or-light'] = { title: 'Heavy or Light', cat: 'qaida', levels: false, how: 'Some letters are read with a full, heavy mouth. Decide if each letter is heavy or light.', run: function (id) {
		var heavy = shuffle(LETTERS.filter(function (l) { return HEAVY.indexOf(l[0]) !== -1; })).slice(0, 6);
		var light = shuffle(LETTERS.filter(function (l) { return HEAVY.indexOf(l[0]) === -1 && 'اءی'.indexOf(l[0]) === -1; })).slice(0, 6);
		quiz(id, shuffle(heavy.concat(light)), function (l) {
			var isH = HEAVY.indexOf(l[0]) !== -1;
			return {
				ask: 'Is this letter <strong>heavy</strong> (full mouth) or <strong>light</strong> (thin)?', show: ar(l[0], 'lg-q__big'), cls: 'lg-opts--wide lg-opts--two',
				options: [{ html: '<b class="lg-hl lg-hl--h">Heavy</b><small>full mouth</small>', ok: isH }, { html: '<b class="lg-hl lg-hl--l">Light</b><small>thin</small>', ok: !isH }],
				after: 'The 7 heavy letters are ' + ar('خ ص ض غ ط ق ظ') + '.'
			};
		}, function (r, n) { return 'You sorted ' + r + ' out of ' + n + ' letters correctly.'; }, byScore);
	} };

	/* ---------- 10. Dua Time ---------- */
	GAMES['dua-time'] = { title: 'Dua Time', cat: 'duas', levels: false, how: 'Read the moment, then pick the dua we say at that time.', run: function (id) {
		var duas = DATA.duas || [];
		if (duas.length < 4) { play.innerHTML = '<p class="lg-q__ask">Duas are not available right now.</p>'; return; }
		quiz(id, deck('duas', duas, 8), function (d) {
			var opts = [d];
			shuffle(duas).forEach(function (x) { if (opts.length < 3 && x.ar !== d.ar) { opts.push(x); } });
			return { ask: 'Which is the dua<br><strong>' + esc(d.when) + '</strong>?', cls: 'lg-opts--wide', options: shuffle(opts).map(function (x) { return { html: ar(x.ar, 'lg-opt__dua'), ok: x === d }; }) };
		}, function (r, n) { return 'You matched ' + r + ' out of ' + n + ' duas.'; }, byScore);
	} };

	/* ---------- 11. Wudu Steps ---------- */
	var stepsGame = function (id, lists, unit, okSfx, doneLine) {
		orderGame(id, lists, {
			cls: 'lg-steps', unit: unit, gridCls: 'lg-opts lg-opts--steps', okSfx: okSfx,
			render: function (t) { return '<span>' + esc(t) + '</span>'; },
			shelf: function () {
				var ol = h('ol', 'lg-steps__done');
				return { el: ol, add: function (t, n) { var li = h('li', '', '<b>' + n + '</b><span>' + esc(t) + '</span>'); ol.appendChild(li); } };
			},
			hint: function (wrap) { var tip = wrap.querySelector('.lg-q__tip') || h('p', 'lg-q__tip'); tip.textContent = 'Not yet. Think about what comes next.'; wrap.appendChild(tip); setTimeout(function () { tip.remove(); }, 1400); },
			done: doneLine || function (n, m) { return 'You put every step in order with ' + m + (m === 1 ? ' mistake.' : ' mistakes.'); }
		});
	};
	GAMES['wudu-steps'] = { title: 'Wudu Steps', cat: 'duas', levels: true, how: 'Tap the steps of wudu in the right order, from the start to the end. Hanafi method.', run: function (id, lv) {
		var all = DATA.wudu || [];
		var steps = lv === 'hard' ? all : all.filter(function (s, i) { return [1, 2, 3, 4, 5, 6, 9].indexOf(i) !== -1; });
		stepsGame(id, [{ items: steps, ask: 'What do we do first? Tap the steps of <strong>wudu</strong> in order.' }], 'Wudu', sfx.drop);
	} };

	/* ---------- 12. Salah Steps ---------- */
	GAMES['salah-steps'] = { title: 'Salah Steps', cat: 'duas', levels: true, how: 'Put the steps of salah in the right order. Hard adds how the prayer ends.', run: function (id, lv) {
		var s = DATA.salah || [];
		var rounds = [{ items: lv === 'hard' ? [s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9]] : [s[0], s[1], s[3], s[4], s[5]], ask: 'Tap the steps of the <strong>first rak\'ah</strong> in order.' }];
		if (lv === 'hard') { rounds.push({ items: [s[11], s[12], s[13], s[14]], ask: 'Now the <strong>end of the prayer</strong>. Tap the steps in order.' }); }
		stepsGame(id, rounds.map(function (r) { r.items = r.items.filter(Boolean); return r; }), 'Part');
	} };

	/* ---------- 13. Prophet Stories ---------- */
	var PROPHETS = [
		['He was the first human and the first prophet.', 'Adam'], ['Allah made him from clay and taught him the names of all things.', 'Adam'],
		['He built a huge ark before the great flood.', 'Nuh'], ['He called his people to Allah for 950 years.', 'Nuh'],
		['The fire was made cool and safe for him.', 'Ibrahim'], ['He built the Kaaba with his son.', 'Ibrahim'],
		['He helped his father build the Kaaba.', 'Ismail'], ['The water of Zamzam came out for him and his mother Hajar.', 'Ismail'],
		['The sea split in two when he struck it with his staff.', 'Musa'], ['Allah spoke to him, and he was given the Tawrah.', 'Musa'],
		['He was born to Maryam without a father.', 'Isa'], ['He spoke as a baby in the cradle, and he was given the Injil.', 'Isa'],
		['A big fish swallowed him, and he made dua inside it.', 'Yunus'], ['He was thrown into a well by his brothers.', 'Yusuf'],
		['He dreamt that eleven stars, the sun and the moon bowed to him.', 'Yusuf'], ['He understood the speech of ants and birds.', 'Sulaiman'],
		['He was given the Zabur, and iron became soft in his hands.', 'Dawud'], ['As a young man he defeated Jalut (Goliath).', 'Dawud'],
		['He was very patient through a long illness.', 'Ayyub'], ['He was sent to the people of Thamud, with a she-camel as a sign.', 'Salih'],
		['He was sent to the strong people of \'Aad.', 'Hud'], ['He told the people of Madyan to be honest in weighing and measuring.', 'Shu\'aib'],
		['He was the father of Yusuf, and he cried until he lost his sight.', 'Yaqub'], ['In old age he prayed for a son, and Allah gave him Yahya.', 'Zakariyya'],
		['He is the last prophet, and the Quran was revealed to him.', 'Muhammad ﷺ'], ['He was known as Al-Amin, the trustworthy, even before prophethood.', 'Muhammad ﷺ']
	];
	GAMES['prophet-stories'] = { title: 'Prophet Stories', cat: 'islam', levels: false, how: 'Read the clue about a prophet and choose his name. (AS) means "peace be upon him".', run: function (id) {
		var names = PROPHETS.map(function (p) { return p[1]; }).filter(function (n, i, a) { return a.indexOf(n) === i; });
		quiz(id, deck('prophets', PROPHETS, 8), function (p) {
			var opts = [p[1]];
			shuffle(names).forEach(function (n) { if (opts.length < 4 && opts.indexOf(n) === -1) { opts.push(n); } });
			var show = function (n) { return n.indexOf('ﷺ') !== -1 ? n : 'Prophet ' + n + ' (AS)'; };
			return { ask: 'Who is this prophet?', show: '<p class="lg-clue">' + esc(p[0]) + '</p>', showCls: 'lg-q__show--clue', cls: 'lg-opts--wide', options: shuffle(opts).map(function (n) { return { html: esc(show(n)), ok: n === p[1] }; }) };
		}, function (r, n) { return 'You knew ' + r + ' out of ' + n + ' prophets.'; }, byScore);
	} };

	/* ---------- 14. Quiz Race ---------- */
	var FACTS = DATA.facts || [];
	GAMES['quiz-race'] = { title: 'Quiz Race', cat: 'islam', levels: false, how: 'Read each sentence and decide: true or false? Every right answer moves your car closer to the finish. New questions every time.', run: function (id) {
		var t = FACTS.filter(function (f) { return f[1]; }), fl = FACTS.filter(function (f) { return !f[1]; });
		var rounds = shuffle(deck('facts-true', t, 5).concat(deck('facts-false', fl, 5)));
		var road = h('div', 'lg-race__road', '<span class="lg-race__flag" aria-hidden="true"></span>');
		var car = h('span', 'lg-race__car', '<i></i>');
		road.appendChild(car);
		quiz(id, rounds, function (f, i) {
			setTimeout(function () { var q = play.querySelector('.lg-q'); if (q) { q.insertBefore(road, q.firstChild); } }, 0);
			return {
				ask: esc(f[0]), cls: 'lg-opts--wide lg-opts--two lg-opts--tf',
				options: [{ html: '<b>True</b>', ok: f[1] === true }, { html: '<b>False</b>', ok: f[1] === false }],
				after: f[1] ? 'This one is true.' : esc(f[2]),
				onAnswer: function (ok, right) { car.style.left = (right * 9) + '%'; if (ok) { setTimeout(sfx.vroom, 150); } }
			};
		}, function (r, n) { return 'You got ' + r + ' out of ' + n + ' right and drove ' + (r * 10) + '% of the way.'; }, byScore);
	} };

	/* ---------- 15. Letter Shapes (letters joined at the start, middle or end of a word) ---------- */
	var JOINERS = 'بتثجحخسشصضطظعغفقكلمنهی';
	var TAT = 'ـ';
	var POS = [['start', 'at the <strong>start</strong> of a word', function (c) { return c + TAT; }], ['middle', 'in the <strong>middle</strong> of a word', function (c) { return TAT + c + TAT; }], ['end', 'at the <strong>end</strong> of a word', function (c) { return TAT + c; }]];
	GAMES['letter-shapes'] = { title: 'Letter Shapes', cat: 'qaida', levels: true, how: 'Letters change shape when they join other letters in a word. Look at the joined shape and find the letter. Easy: start of a word. Hard: middle and end too.', run: function (id, lv) {
		var hard = lv === 'hard';
		var pool = JOINERS.split('').map(function (c) { return L[c]; });
		quiz(id, shuffle(pool).slice(0, 10), function (l) {
			var pos = hard ? pick(POS) : POS[0];
			var opts = [l];
			var near = hard ? familyOf(l[0]).map(function (c) { return L[c]; }) : [];
			near.concat(shuffle(pool)).forEach(function (x) { if (opts.length < (hard ? 4 : 3) && opts.indexOf(x) === -1) { opts.push(x); } });
			return {
				ask: 'This letter is joined ' + pos[1] + '. Which letter is it?', show: ar(pos[2](l[0]), 'lg-q__big'),
				cls: 'lg-opts--letters' + (opts.length === 4 ? ' lg-opts--four' : ''),
				options: shuffle(opts).map(function (x) { return { html: ar(x[0], 'lg-opt__ar') + '<small class="lg-opt__name">' + x[1] + '</small>', label: x[1], ok: x === l }; }),
				after: 'This is ' + ar(l[0]) + ' ' + l[1] + '.'
			};
		}, function (r, n) { return 'You recognised ' + r + ' out of ' + n + ' joined letters.'; }, byScore);
	} };

	/* ---------- 16. Join the Letters (Qaida: letters written together) ---------- */
	GAMES['join-letters'] = { title: 'Join the Letters', cat: 'qaida', levels: true, how: 'Separate letters are shown from right to left. Choose how they look when they are written together. Easy: two letters. Hard: three letters.', run: function (id, lv) {
		var hard = lv === 'hard';
		var joiners = JOINERS.split('');
		var any = tapLetters.map(function (l) { return l[0]; });
		var rounds = [];
		for (var i = 0; i < 10; i++) {
			var w = [pick(joiners)];
			if (hard) { w.push(pick(joiners)); }
			var lastL;
			do { lastL = pick(any); } while (lastL === w[w.length - 1]);
			w.push(lastL);
			rounds.push(w);
		}
		quiz(id, rounds, function (w) {
			var word = w.join('');
			var opts = [word];
			var add = function (x) { if (x && opts.indexOf(x) === -1 && opts.length < 4) { opts.push(x); } };
			add(w.slice().reverse().join(''));
			var swapAt = Math.floor(Math.random() * w.length);
			var fam = familyOf(w[swapAt]);
			if (fam.length) { var w2 = w.slice(); w2[swapAt] = pick(fam); add(w2.join('')); }
			var guard = 0;
			while (opts.length < 4 && guard++ < 20) { var w3 = w.slice(); w3[Math.floor(Math.random() * w.length)] = pick(any); add(w3.join('')); }
			var parts = '<span class="lg-join" dir="rtl">' + w.map(function (c) { return '<b>' + ar(c) + '</b>'; }).join('<i aria-hidden="true">+</i>') + '</span>';
			return {
				ask: 'Join these letters. Which word do they make?', show: parts, showCls: 'lg-q__show--row', cls: 'lg-opts--letters lg-opts--four',
				options: shuffle(opts).map(function (x) { return { html: ar(x, 'lg-opt__ar'), label: x, ok: x === word }; }),
				after: 'Together they are written ' + ar(word) + '. We read from right to left.'
			};
		}, function (r, n) { return 'You joined ' + r + ' out of ' + n + ' words correctly.'; }, byScore);
	} };

	/* ---------- 17. Read It Right (which letter makes this sound?) ---------- */
	var SOUNDS = [['ب', 'b'], ['ت', 't'], ['ج', 'j'], ['د', 'd'], ['ر', 'r'], ['ز', 'z'], ['س', 's'], ['ش', 'sh'], ['ف', 'f'], ['ق', 'q'], ['ك', 'k'], ['ل', 'l'], ['م', 'm'], ['ن', 'n']];
	var VOWELS = [['َ', 'a', 'Zabar'], ['ِ', 'i', 'Zer'], ['ُ', 'u', 'Pesh'], ['ً', 'an', 'Do Zabar'], ['ٍ', 'in', 'Do Zer'], ['ٌ', 'un', 'Do Pesh']];
	GAMES['read-it-right'] = { title: 'Read It Right', cat: 'qaida', levels: true, how: 'You see a sound written in English letters, like "bu". Find the Arabic letter with the right mark that is read that way. Easy: Zabar, Zer, Pesh. Hard: Do Zabar, Do Zer and Do Pesh too.', run: function (id, lv) {
		var marks = lv === 'hard' ? VOWELS : VOWELS.slice(0, 3);
		var rounds = [];
		for (var i = 0; i < 10; i++) { rounds.push({ s: pick(SOUNDS), v: pick(marks) }); }
		quiz(id, rounds, function (r) {
			var opts = [r.v];
			shuffle(marks).forEach(function (m) { if (opts.length < Math.min(4, marks.length) && m !== r.v) { opts.push(m); } });
			return {
				ask: 'Which one is read <strong class="lg-sound">"' + r.s[1] + r.v[1] + '"</strong>?', cls: 'lg-opts--letters' + (opts.length === 4 ? ' lg-opts--four' : ' lg-opts--three'),
				options: shuffle(opts).map(function (m) { return { html: ar(r.s[0] + m[0], 'lg-opt__ar'), label: r.s[1] + m[1], ok: m === r.v }; }),
				after: ar(r.s[0] + r.v[0]) + ' is read "' + r.s[1] + r.v[1] + '" because of the ' + r.v[2] + '.'
			};
		}, function (r, n) { return 'You read ' + r + ' out of ' + n + ' sounds correctly.'; }, byScore);
	} };

	/* ---------- 18. Surah Order (the last surahs of the Quran) ---------- */
	var SURAHS = [[93, 'Ad-Duha'], [94, 'Ash-Sharh'], [95, 'At-Tin'], [96, 'Al-Alaq'], [97, 'Al-Qadr'], [98, 'Al-Bayyinah'], [99, 'Az-Zalzalah'], [100, 'Al-Adiyat'], [101, 'Al-Qariah'], [102, 'At-Takathur'], [103, 'Al-Asr'], [104, 'Al-Humazah'], [105, 'Al-Fil'], [106, 'Quraysh'], [107, 'Al-Maun'], [108, 'Al-Kawthar'], [109, 'Al-Kafirun'], [110, 'An-Nasr'], [111, 'Al-Masad'], [112, 'Al-Ikhlas'], [113, 'Al-Falaq'], [114, 'An-Nas']];
	var listOrder = function (id, rounds, unit, line) {
		orderGame(id, rounds, {
			cls: 'lg-steps', unit: unit, gridCls: 'lg-opts lg-opts--steps lg-opts--names',
			render: function (x) { return '<span>' + esc(x[1]) + '</span>'; },
			shelf: function () {
				var ol = h('ol', 'lg-steps__done');
				return { el: ol, add: function (x) { ol.appendChild(h('li', '', '<b>' + x[0] + '</b><span>' + esc(x[1]) + '</span>')); } };
			},
			hint: function (wrap) { var tip = wrap.querySelector('.lg-q__tip') || h('p', 'lg-q__tip'); tip.textContent = 'Not yet. Which one comes next?'; wrap.appendChild(tip); setTimeout(function () { tip.remove(); }, 1400); },
			done: line
		});
	};
	GAMES['surah-order'] = { title: 'Surah Order', cat: 'islam', levels: true, how: 'Tap the short surahs in the order they come in the Quran. The number of each surah appears when you get it right. Easy: from Al-Fil to An-Nas. Hard: from Ad-Duha to An-Nas.', run: function (id, lv) {
		var hard = lv === 'hard';
		var from = hard ? 0 : 12, len = hard ? 7 : 5;
		var rounds = [];
		for (var k = 0; k < 2; k++) {
			var st = from + Math.floor(Math.random() * (SURAHS.length - from - len + 1));
			var run = SURAHS.slice(st, st + len);
			rounds.push({ items: run, ask: 'Tap the surahs in Quran order, starting with <strong>' + esc(run[0][1]) + '</strong>.' });
		}
		listOrder(id, rounds, 'Round', function (n, m) { return 'You put the surahs in order with ' + m + (m === 1 ? ' mistake.' : ' mistakes.'); });
	} };

	/* ---------- 19. Islamic Months ---------- */
	GAMES['islamic-months'] = { title: 'Islamic Months', cat: 'islam', levels: true, how: 'Tap the months of the Islamic (Hijri) year in order. Easy: six months in a row. Hard: all twelve, from Muharram to Dhul Hijjah.', run: function (id, lv) {
		var months = (DATA.months || []).map(function (m, i) { return [i + 1, m]; });
		if (months.length !== 12) { play.innerHTML = '<p class="lg-q__ask">The months are not available right now.</p>'; return; }
		var items;
		if (lv === 'hard') { items = months; } else { var st = Math.floor(Math.random() * 7); items = months.slice(st, st + 6); }
		listOrder(id, [{ items: items, ask: 'Tap the Islamic months in order, starting with <strong>' + esc(items[0][1]) + '</strong>.' }], 'Year', function (n, m) { return 'You put the months in order with ' + m + (m === 1 ? ' mistake.' : ' mistakes.'); });
	} };

	ORDER = ['balloon-pop', 'whack-a-letter', 'memory-cards', 'letter-train', 'missing-letter', 'odd-one-out', 'dot-detective', 'letter-shapes', 'join-letters', 'harakat-hero', 'read-it-right', 'heavy-or-light', 'dua-time', 'wudu-steps', 'salah-steps', 'surah-order', 'islamic-months', 'prophet-stories', 'quiz-race'];

	/* ---------- hub, intro screen and navigation ---------- */
	var tiles = root.querySelectorAll('[data-game]');
	var paintHub = function () {
		Array.prototype.forEach.call(tiles, function (c) {
			var s = c.querySelector('.lg-tile__best');
			var b = best(c.getAttribute('data-game'));
			if (s) { s.innerHTML = b ? starRow(b) : '<span class="lg-tile__new">New</span>'; }
		});
		var total = ORDER.reduce(function (a, g) { return a + best(g); }, 0);
		var sum = root.querySelector('.lg-hub__total');
		if (sum) { sum.innerHTML = starRow(Math.min(3, Math.ceil(total / (ORDER.length)))) + '<span><b>' + total + '</b> of ' + (ORDER.length * 3) + ' stars collected</span>'; }
	};
	var filters = root.querySelectorAll('.lg-filter');
	Array.prototype.forEach.call(filters, function (f) {
		f.addEventListener('click', function () {
			var cat = f.getAttribute('data-cat');
			Array.prototype.forEach.call(filters, function (x) { x.setAttribute('aria-pressed', String(x === f)); });
			Array.prototype.forEach.call(tiles, function (t) { t.parentNode.hidden = cat !== 'all' && t.getAttribute('data-cat') !== cat; });
		});
	});

	var start = function (id) {
		if (stop) { stop(); stop = null; }
		play.innerHTML = '';
		progress(0);
		info('');
		current = id;
		lastTick = 0;
		sfx.go();
		stop = GAMES[id].run(id, level(id)) || null;
	};
	var intro = function (id) {
		var g = GAMES[id];
		play.innerHTML = '';
		progress(0);
		info('');
		var card = h('div', 'lg-intro');
		var tile = root.querySelector('[data-game="' + id + '"] .lg-tile__art');
		if (tile) { var art = tile.cloneNode(true); art.classList.add('lg-intro__art'); card.appendChild(art); }
		card.appendChild(h('p', 'lg-intro__how', g.how));
		if (g.levels) {
			var lv = h('div', 'lg-levels');
			lv.setAttribute('role', 'group');
			lv.setAttribute('aria-label', 'Level');
			[['easy', 'Easy'], ['hard', 'Hard']].forEach(function (x) {
				var b = btn('lg-level', x[1]);
				b.setAttribute('aria-pressed', String(level(id) === x[0]));
				b.addEventListener('click', function () {
					store.set('level-' + id, x[0]);
					sfx.click();
					Array.prototype.forEach.call(lv.children, function (c) { c.setAttribute('aria-pressed', String(c === b)); });
				});
				lv.appendChild(b);
			});
			card.appendChild(lv);
		}
		if (g.groups) {
			var gw = h('div', 'lg-groups');
			gw.appendChild(h('p', 'lg-groups__ask', 'Which letters?'));
			gw.appendChild(h('p', 'lg-groups__tip', 'Beginners can start with Group 1 and move on as they learn.'));
			var gr = h('div', 'lg-groups__row');
			gr.setAttribute('role', 'group');
			gr.setAttribute('aria-label', 'Which letters');
			var cur = groupOf(id);
			var opts = GROUPS.map(function (grp, k) { return [k + 1, grp]; });
			opts.push([0, null]);
			opts.forEach(function (o) {
				var GC = ['#E8593C', '#2F80C9', '#1C9E7C', '#8E4FC2'];
				var inner = o[1]
					? '<span class="lg-group__ar" dir="rtl">' + o[1].map(function (x, n) { return '<span class="lg-ar" lang="ar" style="color:' + GC[n] + '">' + x[0] + '</span>'; }).join('') + '</span><small>Group ' + o[0] + '</small>'
					: '<span class="lg-group__ar" dir="rtl"><span class="lg-ar" lang="ar">ا</span><b class="lg-group__to">to</b><span class="lg-ar" lang="ar">ی</span></span><small>All 28 letters</small>';
				var b = btn('lg-group', inner);
				b.setAttribute('aria-label', o[1] ? 'Group ' + o[0] + ': ' + o[1].map(function (x) { return x[1]; }).join(', ') : 'All 28 letters');
				b.setAttribute('aria-pressed', String(cur === o[0]));
				b.addEventListener('click', function () {
					store.set('group-' + id, String(o[0]));
					sfx.click();
					Array.prototype.forEach.call(gr.children, function (c) { c.setAttribute('aria-pressed', String(c === b)); });
				});
				gr.appendChild(b);
			});
			gw.appendChild(gr);
			card.appendChild(gw);
		}
		if (best(id)) { card.appendChild(h('p', 'lg-intro__best', 'Your best: ' + starRow(best(id)))); }
		var go = btn('ljq-btn ljq-btn--dark ljq-btn--lg lg-intro__go', 'Start ' + ljqArrow());
		go.addEventListener('click', function () { start(id); });
		card.appendChild(go);
		play.appendChild(card);
		go.focus({ preventScroll: true });
	};
	var ljqArrow = function () { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'; };
	var open = function (id, push) {
		if (!GAMES[id]) { return; }
		if (stop) { stop(); stop = null; }
		hub.hidden = true; stage.hidden = false;
		titleEl.textContent = GAMES[id].title;
		var tileEl = root.querySelector('[data-game="' + id + '"]');
		var tone = tileEl ? (tileEl.className.match(/lg-tile--(\w+)/) || [])[1] : '';
		stage.className = 'lg-stage' + (tone ? ' lg-stage--' + tone : '');
		current = id;
		intro(id);
		if (push && window.location.hash !== '#' + id) { history.pushState(null, '', '#' + id); }
		var top = root.getBoundingClientRect().top + window.pageYOffset - 90;
		if (Math.abs(window.pageYOffset - top) > 40) { window.scrollTo({ top: top, behavior: 'smooth' }); }
	};
	var close = function (push) {
		if (stop) { stop(); stop = null; }
		current = null;
		play.innerHTML = '';
		stage.hidden = true; hub.hidden = false;
		if (push && window.location.hash) { history.pushState(null, '', window.location.pathname + window.location.search); }
	};
	Array.prototype.forEach.call(tiles, function (c) {
		c.addEventListener('click', function () { open(c.getAttribute('data-game'), true); });
	});
	stage.querySelector('.lg-back').addEventListener('click', function () { close(true); });

	/* Keyboard: 1 to 6 pick an answer, Enter starts or plays again. */
	document.addEventListener('keydown', function (e) {
		if (stage.hidden || e.altKey || e.ctrlKey || e.metaKey) { return; }
		var t = e.target;
		if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) { return; }
		var n = parseInt(e.key, 10);
		if (n >= 1 && n <= 9) {
			var opts = play.querySelectorAll('.lg-opt:not([disabled])');
			if (opts[n - 1]) { e.preventDefault(); opts[n - 1].click(); }
		}
	});

	/* Full screen, where the browser allows it (not on iPhone). */
	var fsBtn = stage.querySelector('.lg-fs');
	if (fsBtn) {
		var canFs = !!(stage.requestFullscreen || stage.webkitRequestFullscreen);
		fsBtn.hidden = !canFs;
		fsBtn.addEventListener('click', function () {
			var on = document.fullscreenElement || document.webkitFullscreenElement;
			if (on) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } else { (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage); }
		});
	}
	var route = function () {
		var id = window.location.hash.replace('#', '');
		if (GAMES[id]) { open(id, false); } else if (current) { close(false); }
	};
	window.addEventListener('popstate', route);
	document.addEventListener('visibilitychange', function () {
		if (document.hidden && stop && (current === 'balloon-pop' || current === 'whack-a-letter')) { stop(); stop = null; intro(current); }
	});
	paintHub();
	route();
})();
