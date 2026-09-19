import archive from './photo-manifest.json';

// One destination registry serves the globe, flight, driving and country archive.
const rows = [
 ['London','United Kingdom',51.507,-.128,'rain','A base in London: cybersecurity, study, work and personal memories.'],
 ['Dhaka','Bangladesh',23.81,90.413,'warm','The origin of the journey. Computer Science and Engineering at AIUB.'],
 ['Portsmouth','United Kingdom',50.819,-1.088,'rain','Postgraduate study in Cybersecurity and Forensic Information Technology.'],
 ['Madrid','Spain',40.417,-3.704,'warm','Architecture, light and a personal chapter in Spain.'],
 ['Paris','France',48.857,2.352,'rain','A personal visit to the Eiffel Tower.'],
 ['Stockholm','Sweden',59.329,18.069,'snow','A northern chapter in the travel archive.'],
 ['Oslo','Norway',59.914,10.752,'snow','A Scandinavian chapter in the journey.'],
 ['Barcelona','Spain',41.388,2.169,'coast','Mediterranean streets and memories from Barcelona.'],
 ['Santorini','Greece',36.393,25.461,'coast','Whitewashed paths and Aegean blue.'],
 ['Corfu','Greece',39.624,19.921,'coast','An Ionian island chapter.'],
 ['Athens','Greece',37.984,23.728,'warm','A Greek chapter, between history and the present.'],
 ['Milan','Italy',45.464,9.19,'warm','The Duomo and Galleria Vittorio Emanuele II.'],
 ['Geneva','Switzerland',46.204,6.143,'rain','Another arrival in the Swiss chapter.'],
 ['Zürich','Switzerland',47.376,8.541,'rain','Conversations and technology in Switzerland.'],
 ['Basel','Switzerland',47.56,7.588,'rain','A confirmed visit; related event material appears below when available.'],
 ['Frankfurt','Germany',50.11,8.682,'rain','A technology chapter in the supplied event archive.'],
 ['Hamburg','Germany',53.551,9.994,'rain','Industry, research and professional conversations.'],
 ['Munich','Germany',48.135,11.582,'rain','A chapter in the supplied professional-event archive.'],
 ['Anacapri','Italy',40.552,14.212,'coast','An island setting in the supplied event archive.'],
 ['Amsterdam','Netherlands',52.368,4.904,'rain','Canal-side memories and a city explored on foot.'],
 ['Istanbul','Türkiye',41.008,28.978,'warm','A personal journey between two continents.'],
 ['Beijing','China',39.904,116.407,'warm','Great Wall memories and a journey through Beijing.'],
 ['Sydney','Australia',-33.869,151.209,'coast','Harbour light and memories from Australia.'],
 ['Tenerife','Spain',28.292,-16.629,'coast','A volcanic island in the personal travel archive.'],
 ['Tromsø','Norway',69.649,18.956,'snow','Seven personal frames from the Arctic chapter.'],
 ['Madinah','Saudi Arabia',24.468,39.611,'desert','A spiritual visit, with love and respect for Prophet Muhammad (peace be upon him).'],
 ['Makkah','Saudi Arabia',21.423,39.826,'desert','A spiritual journey and moments of reflection at Masjid al-Haram.'],
 ['Dubai','United Arab Emirates',25.204,55.271,'desert','Marina views and a confirmed visit to Dubai.']
];
const existing={London:['C94C00E9-3BDE-4F91-930E-B1E26685FF71_1_201_a','IMG_7399'],Santorini:['IMG_6799','IMG_0840','IMG_6315','IMG_6288','IMG_6239','IMG_0770'],Geneva:['IMG_5322'],Amsterdam:['IMG_5641','IMG_8806'],Dubai:['IMG_8625']};
export const destinations=rows.map(([city,country,lat,lon,weather,story])=>({city,country,lat,lon,weather,story,sacred:/Makkah|Madinah/.test(city),photos:[...(archive[city]||[]),...(existing[city]||[]).map(id=>({src:`./assets/photos/${id}.webp`,caption:`${city} · Personal archive`,kind:'Personal photograph',original:id}))]}));
export const countries=[...new Set(destinations.map(d=>d.country))];
destinations.forEach(d=>{d.id=d.city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ø/g,'o').toLowerCase().replace(/\s+/g,'-');d.environment=d.weather;d.audioProfile=d.weather;});
export const extraArchive={NTV:archive.NTV||[],Türkiye:archive['Türkiye']||[]};
export const getDestination=name=>destinations.find(d=>d.city.toLowerCase()===(name==='Medina'?'Madinah':name).toLowerCase());
export function announceDestination(city){const d=getDestination(city);if(d)window.dispatchEvent(new CustomEvent('zr:destination',{detail:d}));}
