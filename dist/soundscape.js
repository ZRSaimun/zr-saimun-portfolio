/* Local, licensed sound effects. No audio is fetched or played until a visitor enables it. */
const FILES = ['engine-idle','engine-drive','engine-boost','soft-brake','collision','glass-break','photo-discover','city-arrival','snow-wind','rain-weather','hot-desert','coastal-ambience','jet-flyby','ui-open','ui-close','repair','snow-step'];
const LOOPS = FILES.filter(n => ['engine-idle','engine-drive','snow-wind','rain-weather','hot-desert','coastal-ambience'].includes(n));
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const destinationWeather = city => /Tromsø|Tromso|Oslo|Stockholm|Mongolia/i.test(city) ? 'snow' : /Dubai|Medina|Madinah|Makkah|Saudi/i.test(city) ? 'desert' : /Dhaka|Bangladesh|Beijing|Madrid|Istanbul|Athens|Milan/i.test(city) ? 'warm' : /Santorini|Corfu|Sydney|Tenerife|Barcelona/i.test(city) ? 'coast' : 'rain';
const weatherFile = {snow:'snow-wind',rain:'rain-weather',desert:'hot-desert',warm:'hot-desert',coast:'coastal-ambience'};

class JourneyAudio {
  constructor() {
    this.enabled=false; this.loading=false; this.volume=.65; this.city='London';
    this.buffers=new Map(); this.loops=new Map(); this.vehicles=new Map(); this.cooldowns=new Map(); this.voices=new Set();
    this.context=null; this.master=null; this.vehicleBus=null; this.ambienceBus=null; this.effectsBus=null; this.error=''; this.request=0;
    try { this.volume=clamp(Number(localStorage.getItem('zr-volume') || .65),0,1); } catch {}
    this.previousSpeed=0; this.previousBoost=false;
    this.bindControls();
    document.addEventListener('visibilitychange',()=>this.visibility());
    window.addEventListener('pagehide',()=>{if(this.context)this.context.suspend().catch(()=>{});});
    window.addEventListener('pageshow',()=>this.visibility());
    window.addEventListener('zr:destination',event=>this.setDestination(event.detail.city));
    window.addEventListener('zr:photo',()=>this.play('photo-discover',.36));
    window.addEventListener('zr:motion',()=>this.mix());
  }
  bindControls() {
    document.querySelectorAll('#soundToggle,[data-sound-toggle]').forEach(button=>{
      if(button.dataset.soundBound)return;
      button.dataset.soundBound='true';button.addEventListener('click',()=>this.toggle());
    });
    document.querySelectorAll('[data-sound-volume]').forEach(input=>{
      input.value=Math.round(this.volume*100);
      input.addEventListener('input',()=>{this.volume=Number(input.value)/100;try{localStorage.setItem('zr-volume',this.volume);}catch{}this.mix();});
    });
    this.render();
  }
  render() {
    const label=this.loading?'Loading sound…':this.error?'Retry sound':this.enabled?'Sound on':'Sound off';
    document.querySelectorAll('#soundToggle,[data-sound-toggle]').forEach(button=>{
      button.setAttribute('aria-pressed',String(this.enabled));
      button.setAttribute('aria-label',this.enabled?'Turn all sound off':'Turn driving and weather sound on');
      const text=button.querySelector('.sound-label');if(text)text.textContent=label;else button.textContent=label;
      button.setAttribute('aria-busy',String(this.loading));
    });
    document.querySelectorAll('[data-sound-status]').forEach(el=>{el.textContent=this.error || (this.loading?'Preparing audio…':this.enabled?'Engine · weather · effects':'Tap Sound on to hear the journey');});
    document.body.classList.toggle('has-sound',this.enabled);
  }
  init() {
    if(this.context)return;
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)throw new Error('Audio is unavailable in this browser.');
    // Safari requires context creation and resume inside the original tap handler.
    this.context=new Context();
    try { if(navigator.audioSession)navigator.audioSession.type='playback'; } catch {}
    this.master=this.context.createGain();this.master.gain.value=0;
    this.vehicleBus=this.context.createGain();this.ambienceBus=this.context.createGain();this.effectsBus=this.context.createGain();
    this.vehicleBus.gain.value=.9;this.ambienceBus.gain.value=.72;this.effectsBus.gain.value=.86;
    this.vehicleBus.connect(this.master);this.ambienceBus.connect(this.master);this.effectsBus.connect(this.master);
    const compressor=this.context.createDynamicsCompressor();
    compressor.threshold.value=-12;compressor.knee.value=14;compressor.ratio.value=4;compressor.attack.value=.01;compressor.release.value=.25;
    this.analyser=this.context.createAnalyser();this.analyser.fftSize=256;
    this.master.connect(compressor);compressor.connect(this.analyser);this.analyser.connect(this.context.destination);
    this.context.addEventListener('statechange',()=>{
      if(this.context.state==='running'){this.mix();return;}
      if(this.enabled&&!document.hidden&&this.context.state==='interrupted'){
        this.error='Audio paused by your device. Tap Retry sound.';this.render();
      }
    });
  }
  async load() {
    const base=import.meta.env.BASE_URL;
    const results=await Promise.allSettled(FILES.map(async name=>{
      if(this.buffers.has(name))return;
      const response=await fetch(base+'assets/audio/'+name+'.mp3',{signal:AbortSignal.timeout(18000)});
      if(!response.ok)throw new Error(name);
      const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(name,buffer);
    }));
    if(results.some(r=>r.status==='rejected'))throw new Error('Some sounds could not load. Tap Retry sound.');
    LOOPS.forEach(name=>{
      if(this.loops.has(name))return;
      const source=this.context.createBufferSource(),gain=this.context.createGain();
      source.buffer=this.buffers.get(name);source.loop=true;gain.gain.value=0;
      source.connect(gain);gain.connect(name.includes('engine')?this.vehicleBus:this.ambienceBus);source.start();
      this.loops.set(name,{source,gain});
    });
  }
  async toggle() {
    const id=++this.request;
    if(this.enabled||this.loading) {
      this.enabled=false;this.loading=false;this.error='';this.mix();this.render();
      if(this.context)setTimeout(()=>{if(!this.enabled&&!this.loading)this.context.suspend().catch(()=>{});},150);
      return;
    }
    try {
      this.init();
      const resume=this.context.resume();
      // An immediately-started silent buffer also unlocks older iOS audio implementations.
      const unlock=this.context.createBufferSource();unlock.buffer=this.context.createBuffer(1,1,22050);unlock.connect(this.master);unlock.start();
      this.loading=true;this.error='';this.render();
      await resume;await this.load();
      if(id!==this.request)return;
      if(this.context.state!=='running')await this.context.resume();
      if(this.context.state!=='running')throw new Error('Tap Retry sound to enable device audio.');
      this.enabled=true;this.loading=false;this.render();this.mix();
      this.play('city-arrival',.48); // Audible confirmation, including when the car is parked.
    } catch(error) {
      if(id!==this.request)return;
      this.enabled=false;this.loading=false;this.error=error.message||'Audio could not start. Tap Retry sound.';this.mix();this.render();
    }
  }
  visibility() {
    if(!this.context)return;
    if(document.hidden){this.mix();this.context.suspend().catch(()=>{});}
    else if(this.enabled)this.context.resume().then(()=>this.mix()).catch(()=>{this.error='Tap Retry sound to resume audio.';this.enabled=false;this.render();});
  }
  level(node,value,time=.1) {
    if(!this.context)return;
    node.cancelScheduledValues(this.context.currentTime);
    node.setTargetAtTime(value,this.context.currentTime,time);
  }
  setVehicle(source,vehicle) {
    this.vehicles.set(source,vehicle);
    this.mix();
  }
  setDestination(city,announce=true) {
    if(!city||city===this.city)return;
    this.city=city;this.mix();if(announce)this.play('city-arrival',.4);
  }
  mix() {
    if(!this.master)return;
    const audible=this.enabled&&!document.hidden;
    this.level(this.master.gain,audible?this.volume:0,.045);
    const road=this.vehicles.get('road'),flight=this.vehicles.get('flight');
    const vehicle=flight?.active?flight:road?.active?road:this.vehicles.get('world');
    const active=!!vehicle?.active&&!window.zrMotionPaused&&!document.querySelector('dialog[open]');
    const velocity=active?Math.abs(vehicle.speed||0):0;
    const rev=clamp(velocity/21,0,1),throttle=active?Math.abs(vehicle.throttle||0):0;
    const mode=this.weatherOverride||destinationWeather(this.city),ambience=weatherFile[mode];
    for(const [name,loop] of this.loops){
      let gain=0;
      if(name==='engine-idle')gain=active?.46*(1-rev*.8):0;
      else if(name==='engine-drive')gain=active?.08+rev*.44+throttle*.055:0;
      else if(name===ambience)gain=active?.26:.38;
      this.level(loop.gain.gain,gain,name.includes('engine')?.1:.65);
      if(name==='engine-drive')this.level(loop.source.playbackRate,.72+rev*1.18+throttle*.07,.12);
      if(name==='engine-idle')this.level(loop.source.playbackRate,.88+rev*.4,.14);
    }
    if(active&&vehicle.braking&&this.previousSpeed>3)this.play('soft-brake',.38);
    if(active&&vehicle.boost&&!this.previousBoost&&velocity>2)this.play('engine-boost',.32);
    this.previousBoost=!!vehicle?.boost;this.previousSpeed=velocity;
  }
  play(name,gain=.5,options={}) {
    if(!this.enabled||document.hidden||this.context?.state!=='running'||!this.buffers.has(name))return;
    const now=this.context.currentTime;
    const cooldown={'city-arrival':1.5,'soft-brake':.8,'glass-break':.2,'collision':.22,'photo-discover':.12,'engine-boost':1.5}[name]||.1;
    if(now-(this.cooldowns.get(name)??-100)<cooldown||this.voices.size>=10)return;
    this.cooldowns.set(name,now);
    const source=this.context.createBufferSource(),volume=this.context.createGain();
    source.buffer=this.buffers.get(name);source.playbackRate.value=options.rate||1;volume.gain.value=clamp(gain,0,.8);
    source.connect(volume);
    let pan=null;
    if(this.context.createStereoPanner){pan=this.context.createStereoPanner();pan.pan.value=clamp(options.pan||0,-1,1);volume.connect(pan);pan.connect(this.effectsBus);}else volume.connect(this.effectsBus);
    this.voices.add(source);source.onended=()=>{source.disconnect();volume.disconnect();pan?.disconnect();this.voices.delete(source);};source.start();
  }
}
export const journeyAudio=new JourneyAudio();
window.zrAudio=journeyAudio;
