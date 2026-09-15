(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const state = { hidden: false };
  function canvasVisible(canvas) {
    const rect = canvas.getBoundingClientRect();
    return !state.hidden && !window.zrMotionPaused && rect.bottom > 0 && rect.top < innerHeight;
  }

  document.body.classList.add('is-locked');
  document.documentElement.style.scrollBehavior = reducedMotion ? 'auto' : 'smooth';
  $('#year').textContent = new Date().getFullYear();

  document.addEventListener('visibilitychange', () => {
    state.hidden = document.hidden;
  });

  function fitCanvas(canvas, context, maxDpr = 2) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, maxDpr);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: rect.height, dpr };
  }

  /* Cinematic entrance */
  const boot = $('#boot');
  const bootBar = $('#bootBar');
  const bootCount = $('#bootCount');
  const bootStatus = $('#bootStatus');
  let bootFinished = false;
  let bootFrame = 0;
  let bootStart = performance.now();
  const bootMessages = [
    'Tracing a life across borders',
    'Verifying the signal',
    'Connecting research and experience',
    'Preparing the journey'
  ];

  function finishBoot() {
    if (bootFinished) return;
    bootFinished = true;
    cancelAnimationFrame(bootFrame);
    bootBar.style.width = '100%';
    bootCount.textContent = '100';
    boot.classList.add('is-done');
    document.body.classList.remove('is-locked');
    setTimeout(() => boot.setAttribute('hidden', ''), 850);
  }

  function updateBoot(now) {
    const duration = reducedMotion ? 150 : 2450;
    const progress = clamp((now - bootStart) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const percent = Math.round(eased * 100);
    bootBar.style.width = `${percent}%`;
    bootCount.textContent = String(percent).padStart(2, '0');
    bootStatus.textContent = bootMessages[Math.min(bootMessages.length - 1, Math.floor(progress * bootMessages.length))];
    if (progress >= 1) finishBoot();
    else bootFrame = requestAnimationFrame(updateBoot);
  }

  $('#skipBoot').addEventListener('click', finishBoot);
  bootFrame = requestAnimationFrame(updateBoot);

  /* Header, menu and page progress */
  const header = $('#siteHeader');
  const scrollProgress = $('#scrollProgress');
  const menuToggle = $('#menuToggle');
  const mobileMenu = $('#mobileMenu');

  function updatePageChrome() {
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    const progress = scrollable > 0 ? scrollY / scrollable : 0;
    scrollProgress.style.transform = `scaleX(${clamp(progress, 0, 1)})`;
    header.classList.toggle('is-scrolled', scrollY > 40);
  }

  function closeMenu() {
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    mobileMenu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }

  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    mobileMenu.setAttribute('aria-hidden', String(!open));
    mobileMenu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  });
  $$('#mobileMenu a').forEach(link => link.addEventListener('click', closeMenu));
  addEventListener('scroll', updatePageChrome, { passive: true });
  updatePageChrome();

  /* Cursor and magnetic interactions */
  if (finePointer && !reducedMotion) {
    const cursor = $('#cursor');
    let mouseX = innerWidth / 2;
    let mouseY = innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    addEventListener('pointermove', event => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      cursor.classList.add('is-visible');
    }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
    $$('a, button, .tilt-card').forEach(element => {
      element.addEventListener('pointerenter', () => cursor.classList.add('is-hovering'));
      element.addEventListener('pointerleave', () => cursor.classList.remove('is-hovering'));
    });

    function animateCursor() {
      cursorX = lerp(cursorX, mouseX, .18);
      cursorY = lerp(cursorY, mouseY, .18);
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    $$('.magnetic').forEach(element => {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .18;
        const y = (event.clientY - rect.top - rect.height / 2) * .18;
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      element.addEventListener('pointerleave', () => {
        element.style.transform = '';
      });
    });

    $$('.tilt-card').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const rx = ((event.clientY - rect.top) / rect.height - .5) * -5;
        const ry = ((event.clientX - rect.left) / rect.width - .5) * 7;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* Hero atmosphere */
  const heroCanvas = $('#heroCanvas');
  const heroContext = heroCanvas.getContext('2d');
  const heroParticles = Array.from({ length: reducedMotion ? 28 : 88 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.7 + .25,
    speed: Math.random() * .00012 + .000025,
    drift: Math.random() * .00016 - .00008,
    alpha: Math.random() * .55 + .15
  }));
  let heroMouse = { x: .5, y: .5 };

  $('.hero').addEventListener('pointermove', event => {
    heroMouse.x = event.clientX / innerWidth;
    heroMouse.y = event.clientY / innerHeight;
  }, { passive: true });

  function drawHero(time = 0) {
    if (canvasVisible(heroCanvas)) {
      const { width, height } = fitCanvas(heroCanvas, heroContext);
      heroContext.clearRect(0, 0, width, height);
      heroContext.save();
      heroContext.globalCompositeOperation = 'screen';
      for (const particle of heroParticles) {
        if (!reducedMotion) {
          particle.y -= particle.speed * 10;
          particle.x += particle.drift * 5;
          if (particle.y < -.02) particle.y = 1.02;
          if (particle.x < -.02) particle.x = 1.02;
          if (particle.x > 1.02) particle.x = -.02;
        }
        const x = particle.x * width + (heroMouse.x - .5) * 22;
        const y = particle.y * height + (heroMouse.y - .5) * 14;
        heroContext.fillStyle = `rgba(202,225,236,${particle.alpha})`;
        heroContext.beginPath();
        heroContext.arc(x, y, particle.size, 0, Math.PI * 2);
        heroContext.fill();
      }
      const pulse = reducedMotion ? .6 : .48 + Math.sin(time * .0012) * .12;
      const gradient = heroContext.createRadialGradient(width * .24, height * .55, 0, width * .24, height * .55, width * .38);
      gradient.addColorStop(0, `rgba(104,215,255,${pulse * .13})`);
      gradient.addColorStop(1, 'rgba(104,215,255,0)');
      heroContext.fillStyle = gradient;
      heroContext.fillRect(0, 0, width, height);
      heroContext.restore();
    }
    requestAnimationFrame(drawHero);
  }
  requestAnimationFrame(drawHero);

  const heroWorld = $('.hero__world');
  const heroPortrait = $('.hero__portrait');
  function updateHeroParallax() {
    if (innerWidth < 760 || reducedMotion || window.zrMotionPaused) return;
    const offset = clamp(-$('.hero').getBoundingClientRect().top, 0, innerHeight);
    heroWorld.style.transform = `scale(${1.04 + offset / innerHeight * .08}) translateY(${offset * .045}px)`;
  }
  addEventListener('scroll', updateHeroParallax, { passive: true });

  /* Progressive reveals */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      if (entry.target.id === 'terminalBody') {
        $$('p', entry.target).forEach((row, index) => setTimeout(() => row.classList.add('is-active'), reducedMotion ? 0 : index * 170));
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: .18 });
  $$('.identity__layout, .experience__heading, .experience-card, .world__header, .research__heading, .paper, .memories__heading, #terminalBody').forEach(element => observer.observe(element));

  const manifesto = $('[data-scrub-text]');
  const manifestoLines = $$('span', manifesto);
  function updateManifesto() {
    const rect = manifesto.getBoundingClientRect();
    const progress = clamp((innerHeight * .72 - rect.top) / (innerHeight * .62), 0, 1);
    manifestoLines.forEach((line, index) => line.classList.toggle('is-active', progress > index / manifestoLines.length + .08));
  }
  addEventListener('scroll', updateManifesto, { passive: true });
  updateManifesto();

  /* Animated cybersecurity network */
  const networkCanvas = $('#networkCanvas');
  const networkContext = networkCanvas.getContext('2d');
  const networkNodes = Array.from({ length: reducedMotion ? 22 : 46 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - .5) * .00016,
    vy: (Math.random() - .5) * .00016,
    r: Math.random() * 1.5 + .7
  }));

  function drawNetwork() {
    if (canvasVisible(networkCanvas)) {
      const { width, height } = fitCanvas(networkCanvas, networkContext);
      networkContext.clearRect(0, 0, width, height);
      networkNodes.forEach(node => {
        if (!reducedMotion) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > 1) node.vx *= -1;
          if (node.y < 0 || node.y > 1) node.vy *= -1;
        }
      });
      for (let i = 0; i < networkNodes.length; i += 1) {
        const a = networkNodes[i];
        for (let j = i + 1; j < networkNodes.length; j += 1) {
          const b = networkNodes[j];
          const dx = (a.x - b.x) * width;
          const dy = (a.y - b.y) * height;
          const distance = Math.hypot(dx, dy);
          if (distance < 150) {
            networkContext.strokeStyle = `rgba(104,215,255,${(1 - distance / 150) * .14})`;
            networkContext.beginPath();
            networkContext.moveTo(a.x * width, a.y * height);
            networkContext.lineTo(b.x * width, b.y * height);
            networkContext.stroke();
          }
        }
      }
      networkNodes.forEach((node, index) => {
        networkContext.fillStyle = index % 8 === 0 ? 'rgba(216,179,106,.7)' : 'rgba(104,215,255,.6)';
        networkContext.beginPath();
        networkContext.arc(node.x * width, node.y * height, node.r, 0, Math.PI * 2);
        networkContext.fill();
      });
    }
    requestAnimationFrame(drawNetwork);
  }
  requestAnimationFrame(drawNetwork);

  /* Scroll-driven journey */
  const journeyScroll = $('#journeyScroll');
  const journeyTrack = $('#journeyTrack');
  const journeyCards = $$('.journey-card');
  const journeyYear = $('#journeyYear');
  const journeyRoute = $('#journeyRouteActive');
  const journeyPlane = $('#journeyPlane');
  let routeLength = 1800;
  try { routeLength = journeyRoute.getTotalLength(); } catch (_) {}
  journeyRoute.style.strokeDasharray = routeLength;
  journeyRoute.style.strokeDashoffset = routeLength;

  function updateJourney() {
    if (innerWidth <= 760) return;
    const rect = journeyScroll.getBoundingClientRect();
    const total = Math.max(1, rect.height - innerHeight);
    const progress = clamp(-rect.top / total, 0, 1);
    const maxTravel = Math.max(0, journeyTrack.scrollWidth - innerWidth + innerWidth * .18);
    journeyTrack.style.transform = `translate3d(${-progress * maxTravel}px, 0, 0)`;
    journeyRoute.style.strokeDashoffset = routeLength * (1 - progress);
    const pathProgress = clamp(progress, 0, .995);
    try {
      const point = journeyRoute.getPointAtLength(routeLength * pathProgress);
      const next = journeyRoute.getPointAtLength(routeLength * Math.min(1, pathProgress + .006));
      const svgRect = journeyRoute.ownerSVGElement.getBoundingClientRect();
      const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
      const x = svgRect.left + point.x / 1500 * svgRect.width;
      const y = svgRect.top + point.y / 260 * svgRect.height;
      journeyPlane.style.left = '0';
      journeyPlane.style.bottom = 'auto';
      journeyPlane.style.top = '0';
      journeyPlane.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
    } catch (_) {}
    const current = Math.min(journeyCards.length - 1, Math.round(progress * (journeyCards.length - 1)));
    journeyCards.forEach((card, index) => card.classList.toggle('is-current', index === current));
    journeyYear.textContent = journeyCards[current].dataset.year;
  }
  addEventListener('scroll', updateJourney, { passive: true });
  addEventListener('resize', updateJourney);
  updateJourney();

  /* Interactive world */
  const destinations = [
    { city: 'London', country: 'United Kingdom', lat: 51.507, lon: -0.128, story: 'The current base — where professional practice, research and global routes meet.' },
    { city: 'Dhaka', country: 'Bangladesh', lat: 23.810, lon: 90.413, story: 'The origin point: education, identity and the first technical questions.' },
    { city: 'Portsmouth', country: 'United Kingdom', lat: 50.819, lon: -1.088, story: 'Postgraduate study in cybersecurity and forensic information technology.' },
    { city: 'Madrid', country: 'Spain', lat: 40.417, lon: -3.704, story: 'A European chapter shaped by movement, culture and observation.' },
    { city: 'Paris', country: 'France', lat: 48.857, lon: 2.352, story: 'A recurring point on the route — ideas, architecture and memory.' },
    { city: 'Stockholm', country: 'Sweden', lat: 59.329, lon: 18.069, story: 'A northern stop that widened the map in 2023.' },
    { city: 'Oslo', country: 'Norway', lat: 59.914, lon: 10.752, story: 'A city revisited — proof that some places become continuing chapters.' },
    { city: 'Barcelona', country: 'Spain', lat: 41.388, lon: 2.169, story: 'Design, public life and a Mediterranean change of pace.' },
    { city: 'Santorini', country: 'Greece', lat: 36.393, lon: 25.461, story: 'A personal archive of white architecture, blue distance and stillness.' },
    { city: 'Zürich', country: 'Switzerland', lat: 47.376, lon: 8.541, story: 'Technology workshops and a startup social connected a new professional community.' },
    { city: 'Frankfurt', country: 'Germany', lat: 50.110, lon: 8.682, story: 'A Quantum × AI event at TechQuartier — two fields meeting in one room.' },
    { city: 'Hamburg', country: 'Germany', lat: 53.551, lon: 9.994, story: 'Industry and research exchanged test-management practice at the Digital Hub.' },
    { city: 'Munich', country: 'Germany', lat: 48.135, lon: 11.582, story: 'Technology careers and professional possibilities at the autumn job fair.' },
    { city: 'Basel', country: 'Switzerland', lat: 47.560, lon: 7.588, story: 'A hands-on microscopy event at ETH Zürich’s Basel campus.' },
    { city: 'Anacapri', country: 'Italy', lat: 40.552, lon: 14.212, story: 'Research and innovation applied to materials, framed by an island setting.' },
    { city: 'Amsterdam', country: 'Netherlands', lat: 52.368, lon: 4.904, story: 'Canals, cold light and another city understood on foot.' },
    { city: 'Istanbul', country: 'Türkiye', lat: 41.008, lon: 28.978, story: 'A threshold between regions, cultures and chapters.' },
    { city: 'Beijing', country: 'China', lat: 39.904, lon: 116.407, story: 'A long-haul journey expanding the story eastward in 2025.' },
    { city: 'Sydney', country: 'Australia', lat: -33.869, lon: 151.209, story: 'EMERGENCE Sydney connected investment conversations with an unforgettable harbour.' },
    { city: 'Tenerife', country: 'Spain', lat: 28.292, lon: -16.629, story: 'A volcanic island chapter in the personal travel archive.' },
    { city: 'Tromsø', country: 'Norway', lat: 69.649, lon: 18.956, story: 'A winter memory beyond the Arctic Circle — cold, quiet and far north.' },
    { city: 'Medina', country: 'Saudi Arabia', lat: 24.468, lon: 39.611, story: 'A chapter of faith, reflection and presence.' },
    { city: 'Dubai', country: 'United Arab Emirates', lat: 25.204, lon: 55.271, story: 'A vertical city where travel portraiture meets professional energy.' }
  ];

  const globeCanvas = $('#globeCanvas');
  const globeContext = globeCanvas.getContext('2d');
  const destinationList = $('#destinationList');
  const globeState = { rotation: -0.2, tilt: -.12, target: -0.2, dragging: false, lastX: 0, auto: true, selected: 0 };
  const globeDots = Array.from({ length: 420 }, (_, index) => {
    const phi = Math.acos(1 - 2 * (index + .5) / 420);
    const theta = Math.PI * (1 + Math.sqrt(5)) * index;
    return { lat: Math.PI / 2 - phi, lon: theta % (Math.PI * 2) - Math.PI };
  });

  function projectGlobe(lat, lon, radius, cx, cy) {
    const longitude = lon + globeState.rotation;
    const x0 = Math.cos(lat) * Math.sin(longitude);
    const z0 = Math.cos(lat) * Math.cos(longitude);
    const y0 = -Math.sin(lat);
    const cosT = Math.cos(globeState.tilt);
    const sinT = Math.sin(globeState.tilt);
    const y = y0 * cosT - z0 * sinT;
    const z = y0 * sinT + z0 * cosT;
    return { x: cx + x0 * radius, y: cy + y * radius, z };
  }

  function selectDestination(index, rotate = true) {
    globeState.selected = index;
    const destination = destinations[index];
    $('#worldIndex').textContent = String(index + 1).padStart(2, '0');
    $('#worldCity').textContent = destination.city;
    $('#worldCountry').textContent = destination.country;
    $('#worldStory').textContent = destination.story;
    $$('button', destinationList).forEach((button, buttonIndex) => button.setAttribute('aria-pressed', String(index === buttonIndex)));
    if (rotate) {
      globeState.auto = false;
      globeState.target = -destination.lon * Math.PI / 180;
    }
  }

  destinations.forEach((destination, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = destination.city;
    button.setAttribute('aria-pressed', String(index === 0));
    button.addEventListener('click', () => selectDestination(index));
    destinationList.append(button);
  });
  $('#worldTotal').textContent = String(destinations.length).padStart(2, '0');

  const globeWrap = $('#globeWrap');
  let globePointerStart = 0;
  globeWrap.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    globeState.dragging = true;
    globeState.auto = false;
    globeState.lastX = event.clientX;
    globePointerStart = event.clientX;
    globeWrap.setPointerCapture?.(event.pointerId);
  });
  globeWrap.addEventListener('pointermove', event => {
    if (!globeState.dragging) return;
    const delta = event.clientX - globeState.lastX;
    globeState.target += delta * .009;
    globeState.lastX = event.clientX;
  });
  globeWrap.addEventListener('pointerup', event => {
    if (!globeState.dragging) return;
    globeState.dragging = false;
    globeWrap.releasePointerCapture?.(event.pointerId);
    if (Math.abs(event.clientX - globePointerStart) > 7) return;
    const rect = globeCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let closest = { index: -1, distance: 28 };
    destinations.forEach((destination, index) => {
      const point = destination._screen;
      if (!point || point.z <= 0) return;
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < closest.distance) closest = { index, distance };
    });
    if (closest.index >= 0) selectDestination(closest.index, false);
  });
  globeWrap.addEventListener('pointercancel', () => { globeState.dragging = false; });

  function drawGlobe() {
    if (!state.hidden && globeCanvas.getBoundingClientRect().bottom > 0 && globeCanvas.getBoundingClientRect().top < innerHeight) {
      const { width, height } = fitCanvas(globeCanvas, globeContext);
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * .405;
      if (!reducedMotion && !window.zrMotionPaused) {
        if (globeState.auto && !globeState.dragging) globeState.target += .00125;
        globeState.rotation = lerp(globeState.rotation, globeState.target, globeState.dragging ? .5 : .055);
      } else {
        globeState.rotation = globeState.target;
      }
      globeContext.clearRect(0, 0, width, height);
      const glow = globeContext.createRadialGradient(cx - radius * .3, cy - radius * .38, 0, cx, cy, radius * 1.12);
      glow.addColorStop(0, 'rgba(104,215,255,.18)');
      glow.addColorStop(.5, 'rgba(14,22,30,.07)');
      glow.addColorStop(1, 'rgba(5,7,11,.02)');
      globeContext.fillStyle = glow;
      globeContext.beginPath();
      globeContext.arc(cx, cy, radius, 0, Math.PI * 2);
      globeContext.fill();
      globeContext.strokeStyle = 'rgba(5,7,11,.24)';
      globeContext.lineWidth = 1;
      globeContext.stroke();

      globeDots.forEach((dot, index) => {
        const point = projectGlobe(dot.lat, dot.lon, radius, cx, cy);
        if (point.z <= -.04) return;
        const alpha = .12 + point.z * .3;
        globeContext.fillStyle = index % 17 === 0 ? `rgba(181,141,73,${alpha + .1})` : `rgba(5,7,11,${alpha})`;
        globeContext.beginPath();
        globeContext.arc(point.x, point.y, .65 + point.z * .8, 0, Math.PI * 2);
        globeContext.fill();
      });

      destinations.forEach((destination, index) => {
        const point = projectGlobe(destination.lat * Math.PI / 180, destination.lon * Math.PI / 180, radius, cx, cy);
        destination._screen = point;
        if (point.z <= 0) return;
        const selected = index === globeState.selected;
        const pulse = selected && !reducedMotion ? 4 + Math.sin(performance.now() * .004) * 2 : 4;
        if (selected) {
          globeContext.strokeStyle = 'rgba(181,141,73,.5)';
          globeContext.beginPath();
          globeContext.arc(point.x, point.y, pulse + 6, 0, Math.PI * 2);
          globeContext.stroke();
        }
        globeContext.fillStyle = selected ? '#b58d49' : 'rgba(5,7,11,.7)';
        globeContext.beginPath();
        globeContext.arc(point.x, point.y, selected ? 4.5 : 2.3, 0, Math.PI * 2);
        globeContext.fill();
      });
    }
    requestAnimationFrame(drawGlobe);
  }

  $('#globeReset').addEventListener('click', () => { globeState.auto = true; });
  requestAnimationFrame(drawGlobe);

  /* Optional ambient sound — always starts off */
  const soundToggle = $('#soundToggle');
  const soundLabel = $('.sound-label', soundToggle);
  let audioContext = null;
  let masterGain = null;
  let soundOn = false;

  function createAmbientSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = .6;
    masterGain.connect(filter).connect(audioContext.destination);

    [55, 82.41, 110].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index * 4 - 3;
      gain.gain.value = index === 0 ? .55 : .2;
      oscillator.connect(gain).connect(masterGain);
      oscillator.start();
    });

    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.frequency.value = .07;
    lfoGain.gain.value = 70;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    return true;
  }

  soundToggle.addEventListener('click', async () => {
    if (!audioContext && !createAmbientSound()) {
      soundLabel.textContent = 'Unavailable';
      return;
    }
    await audioContext.resume();
    soundOn = !soundOn;
    const now = audioContext.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(soundOn ? .035 : 0, now + .8);
    soundToggle.setAttribute('aria-pressed', String(soundOn));
    soundToggle.setAttribute('aria-label', soundOn ? 'Turn ambient sound off' : 'Turn ambient sound on');
    soundLabel.textContent = soundOn ? 'Sound on' : 'Sound off';
  });

  /* Event archive */
  const ticketModal = $('#ticketModal');
  const ticketImage = $('#ticketImage');
  $$('.ticket-open').forEach(button => {
    button.addEventListener('click', () => {
      ticketImage.src = button.dataset.ticket;
      ticketImage.alt = button.dataset.alt || 'Event ticket archive';
      ticketModal.showModal();
    });
  });
  $('.ticket-modal__close').addEventListener('click', () => ticketModal.close());

  /* Film-strip memory archive */
  const film = $('#film');
  const filmProgress = $('#filmProgress');
  let filmDragging = false;
  let filmStartX = 0;
  let filmStartScroll = 0;

  function updateFilmProgress() {
    const max = film.scrollWidth - film.clientWidth;
    const progress = max > 0 ? film.scrollLeft / max : 0;
    filmProgress.style.transform = `scaleX(${clamp(progress, .02, 1)})`;
  }

  film.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') return;
    filmDragging = true;
    filmStartX = event.clientX;
    filmStartScroll = film.scrollLeft;
  });
  film.addEventListener('pointermove', event => {
    if (!filmDragging) return;
    if (Math.abs(event.clientX - filmStartX) < 8) return;
    film.classList.add('is-dragging');
    film.setPointerCapture?.(event.pointerId);
    film.scrollLeft = filmStartScroll - (event.clientX - filmStartX) * 1.25;
  });
  film.addEventListener('pointerup', event => {
    filmDragging = false;
    film.classList.remove('is-dragging');
    film.releasePointerCapture?.(event.pointerId);
  });
  film.addEventListener('pointercancel', () => {
    filmDragging = false;
    film.classList.remove('is-dragging');
  });
  film.addEventListener('scroll', updateFilmProgress, { passive: true });
  film.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      film.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * Math.min(innerWidth * .72, 600), behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  });
  updateFilmProgress();

  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  const lightboxTitle = $('#lightboxTitle');
  const lightboxCaption = $('#lightboxCaption');
  $$('.memory').forEach(memory => {
    let pointerStart = 0;
    memory.addEventListener('pointerdown', event => { pointerStart = event.clientX; });
    memory.addEventListener('click', event => {
      if (event.detail > 0 && Math.abs(event.clientX - pointerStart) > 8) return;
      lightboxImage.src = memory.dataset.full;
      lightboxImage.alt = $('img', memory).alt;
      lightboxTitle.textContent = memory.dataset.title;
      lightboxCaption.textContent = memory.dataset.caption;
      lightbox.showModal();
    });
  });
  $('.lightbox__close').addEventListener('click', () => lightbox.close());

  [ticketModal, lightbox].forEach(dialog => {
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
  });

  /* Source notes */
  const sourcesToggle = $('#sourcesToggle');
  const sourcesBody = $('#sourcesBody');
  sourcesToggle.addEventListener('click', () => {
    const open = sourcesToggle.getAttribute('aria-expanded') !== 'true';
    sourcesToggle.setAttribute('aria-expanded', String(open));
    $('b', sourcesToggle).textContent = open ? '−' : '+';
    sourcesBody.hidden = !open;
  });

  /* Closing signal field */
  const closingCanvas = $('#closingCanvas');
  const closingContext = closingCanvas.getContext('2d');
  const closingPoints = Array.from({ length: reducedMotion ? 25 : 70 }, () => ({
    x: Math.random(), y: Math.random(), z: Math.random(), speed: Math.random() * .0003 + .00005
  }));

  function drawClosing(time = 0) {
    if (canvasVisible(closingCanvas)) {
      const { width, height } = fitCanvas(closingCanvas, closingContext);
      closingContext.clearRect(0, 0, width, height);
      closingContext.strokeStyle = 'rgba(216,179,106,.2)';
      closingContext.lineWidth = 1;
      closingContext.beginPath();
      closingContext.moveTo(width * .08, height * .78);
      closingContext.bezierCurveTo(width * .28, height * .42, width * .62, height * .92, width * .94, height * .26);
      closingContext.stroke();
      const routeT = reducedMotion ? .65 : (time * .000045) % 1;
      const routeX = lerp(width * .08, width * .94, routeT);
      const routeY = height * (.62 - Math.sin(routeT * Math.PI) * .16 + Math.sin(routeT * Math.PI * 2) * .08);
      closingContext.fillStyle = '#68d7ff';
      closingContext.shadowColor = '#68d7ff';
      closingContext.shadowBlur = 14;
      closingContext.beginPath();
      closingContext.arc(routeX, routeY, 2.6, 0, Math.PI * 2);
      closingContext.fill();
      closingContext.shadowBlur = 0;

      closingPoints.forEach(point => {
        if (!reducedMotion) {
          point.y -= point.speed;
          if (point.y < -.02) point.y = 1.02;
        }
        closingContext.fillStyle = `rgba(241,238,231,${.12 + point.z * .48})`;
        closingContext.beginPath();
        closingContext.arc(point.x * width, point.y * height, .4 + point.z * 1.4, 0, Math.PI * 2);
        closingContext.fill();
      });
    }
    requestAnimationFrame(drawClosing);
  }
  requestAnimationFrame(drawClosing);

  /* Pilot mode — a small explorable route */
  const pilot = $('#pilot');
  const pilotCanvas = $('#pilotCanvas');
  const pilotContext = pilotCanvas.getContext('2d');
  const pilotScore = $('#pilotScore');
  const pilotMessage = $('#pilotMessage');
  const pilotKeys = { up: false, down: false, left: false, right: false };
  const pilotPlane = { x: .16, y: .58, vx: 0, vy: 0, angle: 0 };
  const pilotSignals = [
    { x: .24, y: .30, label: 'LONDON', found: false },
    { x: .46, y: .68, label: 'ZÜRICH', found: false },
    { x: .62, y: .31, label: 'BEIJING', found: false },
    { x: .79, y: .72, label: 'SYDNEY', found: false },
    { x: .89, y: .38, label: 'DUBAI', found: false }
  ];
  const pilotStars = Array.from({ length: 130 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + .2, a: Math.random() * .6 + .15 }));
  let pilotOpen = false;
  let pilotAnimation = 0;
  let pilotLastTime = 0;
  let pilotReturnFocus = null;

  function resetPilot() {
    Object.assign(pilotPlane, { x: .12, y: .58, vx: 0, vy: 0, angle: 0 });
    Object.keys(pilotKeys).forEach(key => { pilotKeys[key] = false; });
    pilotSignals.forEach(signal => { signal.found = false; });
    pilotScore.textContent = '0';
    pilotMessage.textContent = 'Use WASD, arrow keys or the controls to navigate.';
  }

  function openPilot() {
    if (pilotOpen) return;
    pilotReturnFocus = document.activeElement;
    resetPilot();
    pilotOpen = true;
    pilot.classList.add('is-open');
    pilot.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pilot-open');
    $('#closePilot').focus();
    pilotLastTime = performance.now();
    pilotAnimation = requestAnimationFrame(drawPilot);
  }

  function closePilot() {
    if (!pilotOpen) return;
    pilotOpen = false;
    cancelAnimationFrame(pilotAnimation);
    pilot.classList.remove('is-open');
    pilot.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pilot-open');
    pilotReturnFocus?.focus();
  }

  function pilotKey(event, active) {
    const keyMap = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right'
    };
    const direction = keyMap[event.key];
    if (direction && pilotOpen) {
      event.preventDefault();
      pilotKeys[direction] = active;
    }
  }

  addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (pilotOpen) closePilot();
      else if (lightbox.open) lightbox.close();
      else if (ticketModal.open) ticketModal.close();
      else closeMenu();
    }
    pilotKey(event, true);
  });
  addEventListener('keyup', event => pilotKey(event, false));

  $('#launchPilot').addEventListener('click', openPilot);
  $('#closePilot').addEventListener('click', closePilot);
  $$('[data-pilot]').forEach(button => {
    const direction = button.dataset.pilot;
    const start = event => {
      event.preventDefault();
      pilotKeys[direction] = true;
      button.setPointerCapture?.(event.pointerId);
    };
    const end = event => {
      pilotKeys[direction] = false;
      button.releasePointerCapture?.(event.pointerId);
    };
    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
  });

  function drawPlane(context, x, y, angle, scale = 1) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.scale(scale, scale);
    context.fillStyle = '#f1eee7';
    context.shadowColor = '#68d7ff';
    context.shadowBlur = 14;
    context.beginPath();
    context.moveTo(19, 0);
    context.lineTo(-9, -5);
    context.lineTo(-16, -17);
    context.lineTo(-21, -17);
    context.lineTo(-17, -3);
    context.lineTo(-28, -1);
    context.lineTo(-28, 2);
    context.lineTo(-17, 4);
    context.lineTo(-21, 17);
    context.lineTo(-16, 17);
    context.lineTo(-9, 6);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawPilot(now) {
    if (!pilotOpen) return;
    const { width, height } = fitCanvas(pilotCanvas, pilotContext);
    const dt = Math.min(2, Math.max(.2, (now - pilotLastTime) / 16.67));
    pilotLastTime = now;
    const acceleration = .00032 * dt;
    if (pilotKeys.up) pilotPlane.vy -= acceleration;
    if (pilotKeys.down) pilotPlane.vy += acceleration;
    if (pilotKeys.left) pilotPlane.vx -= acceleration;
    if (pilotKeys.right) pilotPlane.vx += acceleration;
    pilotPlane.vx *= Math.pow(.94, dt);
    pilotPlane.vy *= Math.pow(.94, dt);
    pilotPlane.vx = clamp(pilotPlane.vx, -.012, .012);
    pilotPlane.vy = clamp(pilotPlane.vy, -.012, .012);
    pilotPlane.x = clamp(pilotPlane.x + pilotPlane.vx * dt, .03, .97);
    pilotPlane.y = clamp(pilotPlane.y + pilotPlane.vy * dt, .14, .95);
    if (Math.hypot(pilotPlane.vx, pilotPlane.vy) > .0002) pilotPlane.angle = Math.atan2(pilotPlane.vy, pilotPlane.vx);

    pilotContext.clearRect(0, 0, width, height);
    const sky = pilotContext.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#02050a');
    sky.addColorStop(.62, '#07131d');
    sky.addColorStop(1, '#101318');
    pilotContext.fillStyle = sky;
    pilotContext.fillRect(0, 0, width, height);
    pilotStars.forEach(star => {
      const drift = reducedMotion ? 0 : now * .008 * star.r;
      const x = (star.x * width - drift) % width;
      pilotContext.fillStyle = `rgba(241,238,231,${star.a})`;
      pilotContext.beginPath();
      pilotContext.arc(x < 0 ? x + width : x, star.y * height, star.r, 0, Math.PI * 2);
      pilotContext.fill();
    });

    pilotContext.setLineDash([2, 9]);
    pilotContext.strokeStyle = 'rgba(104,215,255,.16)';
    pilotContext.beginPath();
    pilotSignals.forEach((signal, index) => {
      const x = signal.x * width;
      const y = signal.y * height;
      if (index === 0) pilotContext.moveTo(x, y);
      else pilotContext.lineTo(x, y);
    });
    pilotContext.stroke();
    pilotContext.setLineDash([]);

    let count = 0;
    pilotSignals.forEach(signal => {
      const x = signal.x * width;
      const y = signal.y * height;
      const distance = Math.hypot((pilotPlane.x - signal.x) * width, (pilotPlane.y - signal.y) * height);
      if (!signal.found && distance < 34) {
        signal.found = true;
        pilotMessage.textContent = `${signal.label} signal connected.`;
        setTimeout(() => {
          if (pilotOpen && pilotSignals.some(item => !item.found)) pilotMessage.textContent = 'Keep flying — another signal is waiting.';
        }, 1400);
      }
      if (signal.found) count += 1;
      const pulse = 9 + Math.sin(now * .004 + signal.x * 10) * 3;
      pilotContext.strokeStyle = signal.found ? 'rgba(216,179,106,.7)' : 'rgba(104,215,255,.5)';
      pilotContext.fillStyle = signal.found ? '#d8b36a' : '#68d7ff';
      pilotContext.beginPath();
      pilotContext.arc(x, y, pulse, 0, Math.PI * 2);
      pilotContext.stroke();
      pilotContext.beginPath();
      pilotContext.arc(x, y, 2.5, 0, Math.PI * 2);
      pilotContext.fill();
      pilotContext.fillStyle = 'rgba(241,238,231,.58)';
      pilotContext.font = '600 9px Manrope, sans-serif';
      pilotContext.letterSpacing = '1px';
      pilotContext.fillText(signal.label, x + 15, y + 4);
    });
    pilotScore.textContent = String(count);
    if (count === pilotSignals.length) pilotMessage.textContent = 'All signals connected. The world is now one route.';

    const speed = 1 + Math.hypot(pilotPlane.vx, pilotPlane.vy) * 35;
    drawPlane(pilotContext, pilotPlane.x * width, pilotPlane.y * height, pilotPlane.angle, speed);
    pilotAnimation = requestAnimationFrame(drawPilot);
  }

  /* Keep canvases sharp when the viewport changes */
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updatePageChrome();
      updateFilmProgress();
      updateJourney();
    }, 120);
  });
})();

/* Destination atlas: a quiet, tactile filter for the route archive. */
document.querySelectorAll('.atlas__filters button').forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    document.querySelectorAll('.atlas__filters button').forEach(item => item.classList.toggle('is-active', item === button));
    document.querySelectorAll('.atlas-card').forEach(card => card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.region !== filter));
  });
});
