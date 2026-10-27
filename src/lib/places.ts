// Point locations the twin samples. Each one is a model grid cell, not a physical
// gauge: values come from global models at the nearest cell to these coordinates.

export interface Station {
  id: string
  name: string
  si: string // Sinhala name
  ta: string // Tamil name
  district: string
  province: string
  lat: number
  lon: number
  /** English Wikipedia article used for the place photo. */
  wiki: string
  /** Landscape used for the illustration when no photo is available. */
  zone: Zone
}

export type Zone = 'coast' | 'hills' | 'plains'

/** The 25 district capitals, plus Negombo. */
export const STATIONS: Station[] = [
  { id: 'colombo', name: 'Colombo', si: 'කොළඹ', ta: 'கொழும்பு', district: 'Colombo', province: 'Western', lat: 6.9271, lon: 79.8612, wiki: 'Colombo', zone: 'coast' },
  { id: 'gampaha', name: 'Gampaha', si: 'ගම්පහ', ta: 'கம்பஹா', district: 'Gampaha', province: 'Western', lat: 7.0873, lon: 79.9925, wiki: 'Gampaha', zone: 'plains' },
  { id: 'negombo', name: 'Negombo', si: 'මීගමුව', ta: 'நீர்கொழும்பு', district: 'Gampaha', province: 'Western', lat: 7.2083, lon: 79.8358, wiki: 'Negombo', zone: 'coast' },
  { id: 'kalutara', name: 'Kalutara', si: 'කළුතර', ta: 'களுத்துறை', district: 'Kalutara', province: 'Western', lat: 6.5854, lon: 79.9607, wiki: 'Kalutara', zone: 'coast' },
  { id: 'kandy', name: 'Kandy', si: 'මහනුවර', ta: 'கண்டி', district: 'Kandy', province: 'Central', lat: 7.2906, lon: 80.6337, wiki: 'Kandy', zone: 'hills' },
  { id: 'matale', name: 'Matale', si: 'මාතලේ', ta: 'மாத்தளை', district: 'Matale', province: 'Central', lat: 7.4675, lon: 80.6234, wiki: 'Matale', zone: 'hills' },
  { id: 'nuwara-eliya', name: 'Nuwara Eliya', si: 'නුවර එළිය', ta: 'நுவரெலியா', district: 'Nuwara Eliya', province: 'Central', lat: 6.9497, lon: 80.7891, wiki: 'Nuwara Eliya', zone: 'hills' },
  { id: 'galle', name: 'Galle', si: 'ගාල්ල', ta: 'காலி', district: 'Galle', province: 'Southern', lat: 6.0535, lon: 80.221, wiki: 'Galle', zone: 'coast' },
  { id: 'matara', name: 'Matara', si: 'මාතර', ta: 'மாத்தறை', district: 'Matara', province: 'Southern', lat: 5.9549, lon: 80.555, wiki: 'Matara, Sri Lanka', zone: 'coast' },
  { id: 'hambantota', name: 'Hambantota', si: 'හම්බන්තොට', ta: 'அம்பாந்தோட்டை', district: 'Hambantota', province: 'Southern', lat: 6.1241, lon: 81.1185, wiki: 'Hambantota', zone: 'coast' },
  { id: 'jaffna', name: 'Jaffna', si: 'යාපනය', ta: 'யாழ்ப்பாணம்', district: 'Jaffna', province: 'Northern', lat: 9.6615, lon: 80.0255, wiki: 'Jaffna', zone: 'coast' },
  { id: 'kilinochchi', name: 'Kilinochchi', si: 'කිලිනොච්චි', ta: 'கிளிநொச்சி', district: 'Kilinochchi', province: 'Northern', lat: 9.3803, lon: 80.377, wiki: 'Kilinochchi', zone: 'plains' },
  { id: 'mannar', name: 'Mannar', si: 'මන්නාරම', ta: 'மன்னார்', district: 'Mannar', province: 'Northern', lat: 8.981, lon: 79.9044, wiki: 'Mannar, Sri Lanka', zone: 'coast' },
  { id: 'vavuniya', name: 'Vavuniya', si: 'වවුනියාව', ta: 'வவுனியா', district: 'Vavuniya', province: 'Northern', lat: 8.7514, lon: 80.4971, wiki: 'Vavuniya', zone: 'plains' },
  { id: 'mullaitivu', name: 'Mullaitivu', si: 'මුලතිව්', ta: 'முல்லைத்தீவு', district: 'Mullaitivu', province: 'Northern', lat: 9.2671, lon: 80.8142, wiki: 'Mullaitivu', zone: 'coast' },
  { id: 'trincomalee', name: 'Trincomalee', si: 'ත්‍රිකුණාමලය', ta: 'திருகோணமலை', district: 'Trincomalee', province: 'Eastern', lat: 8.5874, lon: 81.2152, wiki: 'Trincomalee', zone: 'coast' },
  { id: 'batticaloa', name: 'Batticaloa', si: 'මඩකලපුව', ta: 'மட்டக்களப்பு', district: 'Batticaloa', province: 'Eastern', lat: 7.731, lon: 81.6747, wiki: 'Batticaloa', zone: 'coast' },
  { id: 'ampara', name: 'Ampara', si: 'අම්පාර', ta: 'அம்பாறை', district: 'Ampara', province: 'Eastern', lat: 7.2975, lon: 81.682, wiki: 'Ampara', zone: 'plains' },
  { id: 'kurunegala', name: 'Kurunegala', si: 'කුරුණෑගල', ta: 'குருநாகல்', district: 'Kurunegala', province: 'North Western', lat: 7.4863, lon: 80.3647, wiki: 'Kurunegala', zone: 'plains' },
  { id: 'puttalam', name: 'Puttalam', si: 'පුත්තලම', ta: 'புத்தளம்', district: 'Puttalam', province: 'North Western', lat: 8.0362, lon: 79.8283, wiki: 'Puttalam', zone: 'coast' },
  { id: 'anuradhapura', name: 'Anuradhapura', si: 'අනුරාධපුරය', ta: 'அனுராதபுரம்', district: 'Anuradhapura', province: 'North Central', lat: 8.3114, lon: 80.4037, wiki: 'Anuradhapura', zone: 'plains' },
  { id: 'polonnaruwa', name: 'Polonnaruwa', si: 'පොළොන්නරුව', ta: 'பொலன்னறுவை', district: 'Polonnaruwa', province: 'North Central', lat: 7.9403, lon: 81.0188, wiki: 'Polonnaruwa', zone: 'plains' },
  { id: 'badulla', name: 'Badulla', si: 'බදුල්ල', ta: 'பதுளை', district: 'Badulla', province: 'Uva', lat: 6.9934, lon: 81.055, wiki: 'Badulla', zone: 'hills' },
  { id: 'monaragala', name: 'Monaragala', si: 'මොණරාගල', ta: 'மொனராகலை', district: 'Monaragala', province: 'Uva', lat: 6.8724, lon: 81.3507, wiki: 'Monaragala', zone: 'plains' },
  { id: 'ratnapura', name: 'Ratnapura', si: 'රත්නපුර', ta: 'இரத்தினபுரி', district: 'Ratnapura', province: 'Sabaragamuwa', lat: 6.6828, lon: 80.3992, wiki: 'Ratnapura', zone: 'hills' },
  { id: 'kegalle', name: 'Kegalle', si: 'කෑගල්ල', ta: 'கேகாலை', district: 'Kegalle', province: 'Sabaragamuwa', lat: 7.2513, lon: 80.3464, wiki: 'Kegalle', zone: 'hills' },
]

export interface RiverPoint {
  id: string
  river: string
  near: string
  basin: string
  lat: number
  lon: number
  /** [river, near, basin] in Sinhala and Tamil. */
  si: [string, string, string]
  ta: [string, string, string]
}

/**
 * Sample points on major rivers, placed a little inland of the mouth so the
 * nearest GloFAS cell sits on the river channel rather than the sea.
 */
export const RIVER_POINTS: RiverPoint[] = [
  { id: 'kelani-hanwella', river: 'Kelani Ganga', near: 'Hanwella', basin: 'Kelani', lat: 6.901, lon: 80.085, si: ['කැලණි ගඟ', 'හංවැල්ල', 'කැලණි'], ta: ['களனி கங்கை', 'ஹங்வெல்ல', 'களனி'] },
  { id: 'kalu-ratnapura', river: 'Kalu Ganga', near: 'Ratnapura', basin: 'Kalu', lat: 6.68, lon: 80.4, si: ['කළු ගඟ', 'රත්නපුර', 'කළු'], ta: ['களு கங்கை', 'இரத்தினபுரி', 'களு'] },
  { id: 'kalu-ellagawa', river: 'Kalu Ganga', near: 'Ellagawa', basin: 'Kalu', lat: 6.73, lon: 80.215, si: ['කළු ගඟ', 'එල්ලගාව', 'කළු'], ta: ['களு கங்கை', 'எல்லகாவ', 'களு'] },
  { id: 'gin-baddegama', river: 'Gin Ganga', near: 'Baddegama', basin: 'Gin', lat: 6.166, lon: 80.18, si: ['ගිං ගඟ', 'බද්දේගම', 'ගිං'], ta: ['ஜின் கங்கை', 'பத்தேகம', 'ஜின்'] },
  { id: 'nilwala-thalgahagoda', river: 'Nilwala Ganga', near: 'Thalgahagoda', basin: 'Nilwala', lat: 5.99, lon: 80.51, si: ['නිල්වලා ගඟ', 'තල්ගහගොඩ', 'නිල්වලා'], ta: ['நில்வளா கங்கை', 'தல்கஹகொட', 'நில்வளா'] },
  { id: 'walawe-embilipitiya', river: 'Walawe Ganga', near: 'Embilipitiya', basin: 'Walawe', lat: 6.34, lon: 80.85, si: ['වලවේ ගඟ', 'ඇඹිලිපිටිය', 'වලවේ'], ta: ['வளவை கங்கை', 'எம்பிலிப்பிட்டிய', 'வளவை'] },
  { id: 'mahaweli-peradeniya', river: 'Mahaweli Ganga', near: 'Peradeniya', basin: 'Mahaweli', lat: 7.269, lon: 80.596, si: ['මහවැලි ගඟ', 'පේරාදෙණිය', 'මහවැලි'], ta: ['மகாவலி கங்கை', 'பேராதனை', 'மகாவலி'] },
  { id: 'mahaweli-manampitiya', river: 'Mahaweli Ganga', near: 'Manampitiya', basin: 'Mahaweli', lat: 7.913, lon: 81.089, si: ['මහවැලි ගඟ', 'මනම්පිටිය', 'මහවැලි'], ta: ['மகாவலி கங்கை', 'மனம்பிட்டிய', 'மகாவலி'] },
  { id: 'attanagalu-dunamale', river: 'Attanagalu Oya', near: 'Dunamale', basin: 'Attanagalu', lat: 7.1, lon: 80.03, si: ['අත්තනගලු ඔය', 'දුනමලේ', 'අත්තනගලු'], ta: ['அத்தனகலு ஓயா', 'துனமலே', 'அத்தனகலு'] },
  { id: 'maha-badalgama', river: 'Maha Oya', near: 'Badalgama', basin: 'Maha Oya', lat: 7.29, lon: 79.98, si: ['මහ ඔය', 'බඩල්ගම', 'මහ ඔය'], ta: ['மகா ஓயா', 'படல்கம', 'மகா ஓயா'] },
  { id: 'deduru-moragaswewa', river: 'Deduru Oya', near: 'Moragaswewa', basin: 'Deduru', lat: 7.65, lon: 80.03, si: ['දැදුරු ඔය', 'මොරගස්වැව', 'දැදුරු'], ta: ['தெதுரு ஓயா', 'மொரகஸ்வெவ', 'தெதுரு'] },
  { id: 'malwathu-anuradhapura', river: 'Malwathu Oya', near: 'Anuradhapura', basin: 'Malwathu', lat: 8.33, lon: 80.39, si: ['මල්වතු ඔය', 'අනුරාධපුරය', 'මල්වතු'], ta: ['மல்வத்து ஓயா', 'அனுராதபுரம்', 'மல்வத்து'] },
  { id: 'kirindi-wellawaya', river: 'Kirindi Oya', near: 'Wellawaya', basin: 'Kirindi', lat: 6.73, lon: 81.1, si: ['කිරිඳි ඔය', 'වැල්ලවාය', 'කිරිඳි'], ta: ['கிரிந்தி ஓயா', 'வெல்லவாய', 'கிரிந்தி'] },
  { id: 'gal-inginiyagala', river: 'Gal Oya', near: 'Inginiyagala', basin: 'Gal Oya', lat: 7.22, lon: 81.54, si: ['ගල් ඔය', 'ඉඟිනියාගල', 'ගල් ඔය'], ta: ['கல் ஓயா', 'இங்கினியாகல', 'கல் ஓயா'] },
]

export const SL_CENTER: [number, number] = [80.7, 7.85]
export const SL_BOUNDS: [[number, number], [number, number]] = [[79.4, 5.75], [82.05, 9.95]]

export const stationById = (id?: string) => STATIONS.find((s) => s.id === id)
export const riverById = (id?: string) => RIVER_POINTS.find((r) => r.id === id)

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r
  const dLon = (b.lon - a.lon) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

export function nearestStation(p: { lat: number; lon: number }) {
  let best = STATIONS[0]
  let d = Infinity
  for (const s of STATIONS) {
    const k = distanceKm(p, s)
    if (k < d) { d = k; best = s }
  }
  return { station: best, km: d }
}

/** River points within `km` of a place, closest first. */
export function riversNear(p: { lat: number; lon: number }, km = 45) {
  return RIVER_POINTS.map((r) => ({ point: r, km: distanceKm(p, r) }))
    .filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km)
}

type L = 'en' | 'si' | 'ta'

/** A town's name in the interface language. */
export const placeName = (s: Station, lang: L) => (lang === 'si' ? s.si : lang === 'ta' ? s.ta : s.name)

/** A district's name; every district shares its name with a town in STATIONS. */
export function districtName(district: string, lang: L) {
  const s = STATIONS.find((x) => x.name === district)
  return s ? placeName(s, lang) : district
}

export function riverNames(r: RiverPoint, lang: L) {
  const [river, near, basin] = lang === 'si' ? r.si : lang === 'ta' ? r.ta : [r.river, r.near, r.basin]
  return { river, near, basin }
}
