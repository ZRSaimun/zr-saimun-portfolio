import {destinations} from './destinations.js';
// Network requests are explicit, cached per destination and never made in the render loop.
export const presets = [
 ['warm','Clear daylight'],['sunrise','Golden sunrise'],['sunset','Cinematic sunset'],['night','Starry night'],
 ['light-snow','Light snowfall'],['snow','Heavy snowfall'],['blizzard','Arctic blizzard'],['rain','Rain'],
 ['heavy-rain','Heavy rain'],['storm','Thunderstorm · no flashing'],['fog','Dense fog'],['desert','Desert heat'],
 ['sandstorm','Sandstorm'],['coast','Coastal wind'],['aurora','Aurora night · artistic']
];
export function weatherCode(code,isDay=1){
 if([71,73,75,77,85,86].includes(code))return 'snow';
 if(code>=95)return 'storm';
 if(code>=51)return 'rain';
 if([45,48].includes(code))return 'fog';
 return isDay?'warm':'night';
}
export function attachWeather(onChange){
 const select=document.querySelector('#weatherMode');
 select.replaceChildren(new Option('Match destination · cinematic','auto'),...presets.map(([v,n])=>new Option(n,v)));
 const host=document.querySelector('.drive-destination');
 const live=document.createElement('button');live.textContent='Use live destination weather';live.type='button';
 const status=document.createElement('p');status.className='live-weather-status';status.setAttribute('aria-live','polite');status.textContent='Cinematic weather · not current conditions';
 const intensity=document.createElement('label');intensity.innerHTML='SNOW INTENSITY <input id="snowIntensity" type="range" min="10" max="100" value="65" aria-label="Snow intensity">';
 const credit=document.createElement('a');credit.href='https://open-meteo.com/';credit.textContent='Weather data: Open-Meteo ↗';credit.target='_blank';credit.rel='noopener';
 host.append(live,status,intensity,credit);
 let sequence=0,liveMode=false,timer,currentRecord=null,selectedCity=null;const cache=new Map();
 const city=()=>selectedCity||destinations[Number(document.querySelector('#driveDestination').value)]||destinations[0];
 function apply(preset){window.zrWeatherPreset=preset;onChange();}
 function caption(){const record=currentRecord;if(!record){status.textContent='Cinematic weather · not current conditions';return;}const c=record.data.current;status.textContent=`${liveMode?'Live destination weather':'Cinematic override · live data unchanged'} · ${record.city}: ${c.temperature_2m}°C · wind ${c.wind_speed_10m} km/h · local ${c.time.replace('T',' ')} · fetched ${new Date(record.at).toLocaleTimeString()}`;}
 async function fetchLive(){const d=city(),id=++sequence;live.disabled=true;status.textContent=`Loading ${d.city} weather…`;try{
  let record=cache.get(d.city);if(!record){try{record=JSON.parse(sessionStorage.getItem('zr-weather-'+d.city));}catch{}}
  if(!record||Date.now()-record.at>15*60*1000){const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:d.lat,longitude:d.lon,current:'temperature_2m,is_day,precipitation,rain,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m',timezone:'auto'});const res=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error('Weather unavailable');const data=await res.json();if(!Number.isFinite(data.current?.weather_code)||!Number.isFinite(data.current?.temperature_2m))throw new Error('Invalid weather data');record={city:d.city,data,at:Date.now()};cache.set(d.city,record);try{sessionStorage.setItem('zr-weather-'+d.city,JSON.stringify(record));}catch{}}
  if(id!==sequence)return;currentRecord=record;liveMode=true;apply(weatherCode(record.data.current.weather_code,record.data.current.is_day));caption();
 }catch{if(id!==sequence)return;liveMode=false;currentRecord=null;apply(select.value==='auto'?d.weather:select.value);status.textContent=`${d.city}: live weather unavailable. Cinematic fallback — not live conditions.`;}finally{if(id===sequence)live.disabled=false;}}
 select.onchange=()=>{sequence++;live.disabled=false;liveMode=false;apply(select.value==='auto'?city().weather:select.value);caption();};
 live.onclick=fetchLive;intensity.querySelector('input').oninput=e=>{window.zrSnowIntensity=Number(e.target.value)/100;onChange();};
 window.addEventListener('zr:destination',event=>{selectedCity=event.detail;clearTimeout(timer);sequence++;live.disabled=false;currentRecord=null;if(liveMode)timer=setTimeout(fetchLive,450);else{apply(select.value==='auto'?city().weather:select.value);caption();}});
 window.zrSnowIntensity=.65;return {get live(){return liveMode;}};
}
