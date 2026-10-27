// Point locations the twin samples. Each one is a model grid cell, not a physical
// gauge: values come from global models at the nearest cell to these coordinates.

export interface Station {
  id: string
  name: string
  si: string // Sinhala name
  district: string
  province: string
  lat: number
  lon: number
}

/** The 25 district capitals, plus Negombo. */
export const STATIONS: Station[] = [
  { id: 'colombo', name: 'Colombo', si: 'කොළඹ', district: 'Colombo', province: 'Western', lat: 6.9271, lon: 79.8612 },
  { id: 'gampaha', name: 'Gampaha', si: 'ගම්පහ', district: 'Gampaha', province: 'Western', lat: 7.0873, lon: 79.9925 },
  { id: 'negombo', name: 'Negombo', si: 'මීගමුව', district: 'Gampaha', province: 'Western', lat: 7.2083, lon: 79.8358 },
  { id: 'kalutara', name: 'Kalutara', si: 'කළුතර', district: 'Kalutara', province: 'Western', lat: 6.5854, lon: 79.9607 },
  { id: 'kandy', name: 'Kandy', si: 'මහනුවර', district: 'Kandy', province: 'Central', lat: 7.2906, lon: 80.6337 },
  { id: 'matale', name: 'Matale', si: 'මාතලේ', district: 'Matale', province: 'Central', lat: 7.4675, lon: 80.6234 },
  { id: 'nuwara-eliya', name: 'Nuwara Eliya', si: 'නුවර එළිය', district: 'Nuwara Eliya', province: 'Central', lat: 6.9497, lon: 80.7891 },
  { id: 'galle', name: 'Galle', si: 'ගාල්ල', district: 'Galle', province: 'Southern', lat: 6.0535, lon: 80.221 },
  { id: 'matara', name: 'Matara', si: 'මාතර', district: 'Matara', province: 'Southern', lat: 5.9549, lon: 80.555 },
  { id: 'hambantota', name: 'Hambantota', si: 'හම්බන්තොට', district: 'Hambantota', province: 'Southern', lat: 6.1241, lon: 81.1185 },
  { id: 'jaffna', name: 'Jaffna', si: 'යාපනය', district: 'Jaffna', province: 'Northern', lat: 9.6615, lon: 80.0255 },
  { id: 'kilinochchi', name: 'Kilinochchi', si: 'කිලිනොච්චි', district: 'Kilinochchi', province: 'Northern', lat: 9.3803, lon: 80.377 },
  { id: 'mannar', name: 'Mannar', si: 'මන්නාරම', district: 'Mannar', province: 'Northern', lat: 8.981, lon: 79.9044 },
  { id: 'vavuniya', name: 'Vavuniya', si: 'වවුනියාව', district: 'Vavuniya', province: 'Northern', lat: 8.7514, lon: 80.4971 },
  { id: 'mullaitivu', name: 'Mullaitivu', si: 'මුලතිව්', district: 'Mullaitivu', province: 'Northern', lat: 9.2671, lon: 80.8142 },
  { id: 'trincomalee', name: 'Trincomalee', si: 'ත්‍රිකුණාමලය', district: 'Trincomalee', province: 'Eastern', lat: 8.5874, lon: 81.2152 },
  { id: 'batticaloa', name: 'Batticaloa', si: 'මඩකලපුව', district: 'Batticaloa', province: 'Eastern', lat: 7.731, lon: 81.6747 },
  { id: 'ampara', name: 'Ampara', si: 'අම්පාර', district: 'Ampara', province: 'Eastern', lat: 7.2975, lon: 81.682 },
  { id: 'kurunegala', name: 'Kurunegala', si: 'කුරුණෑගල', district: 'Kurunegala', province: 'North Western', lat: 7.4863, lon: 80.3647 },
  { id: 'puttalam', name: 'Puttalam', si: 'පුත්තලම', district: 'Puttalam', province: 'North Western', lat: 8.0362, lon: 79.8283 },
  { id: 'anuradhapura', name: 'Anuradhapura', si: 'අනුරාධපුරය', district: 'Anuradhapura', province: 'North Central', lat: 8.3114, lon: 80.4037 },
  { id: 'polonnaruwa', name: 'Polonnaruwa', si: 'පොළොන්නරුව', district: 'Polonnaruwa', province: 'North Central', lat: 7.9403, lon: 81.0188 },
  { id: 'badulla', name: 'Badulla', si: 'බදුල්ල', district: 'Badulla', province: 'Uva', lat: 6.9934, lon: 81.055 },
  { id: 'monaragala', name: 'Monaragala', si: 'මොණරාගල', district: 'Monaragala', province: 'Uva', lat: 6.8724, lon: 81.3507 },
  { id: 'ratnapura', name: 'Ratnapura', si: 'රත්නපුර', district: 'Ratnapura', province: 'Sabaragamuwa', lat: 6.6828, lon: 80.3992 },
  { id: 'kegalle', name: 'Kegalle', si: 'කෑගල්ල', district: 'Kegalle', province: 'Sabaragamuwa', lat: 7.2513, lon: 80.3464 },
]

export interface RiverPoint {
  id: string
  river: string
  near: string
  basin: string
  lat: number
  lon: number
}

/**
 * Sample points on major rivers, placed a little inland of the mouth so the
 * nearest GloFAS cell sits on the river channel rather than the sea.
 */
export const RIVER_POINTS: RiverPoint[] = [
  { id: 'kelani-hanwella', river: 'Kelani Ganga', near: 'Hanwella', basin: 'Kelani', lat: 6.901, lon: 80.085 },
  { id: 'kalu-ratnapura', river: 'Kalu Ganga', near: 'Ratnapura', basin: 'Kalu', lat: 6.68, lon: 80.4 },
  { id: 'kalu-ellagawa', river: 'Kalu Ganga', near: 'Ellagawa', basin: 'Kalu', lat: 6.73, lon: 80.215 },
  { id: 'gin-baddegama', river: 'Gin Ganga', near: 'Baddegama', basin: 'Gin', lat: 6.166, lon: 80.18 },
  { id: 'nilwala-thalgahagoda', river: 'Nilwala Ganga', near: 'Thalgahagoda', basin: 'Nilwala', lat: 5.99, lon: 80.51 },
  { id: 'walawe-embilipitiya', river: 'Walawe Ganga', near: 'Embilipitiya', basin: 'Walawe', lat: 6.34, lon: 80.85 },
  { id: 'mahaweli-peradeniya', river: 'Mahaweli Ganga', near: 'Peradeniya', basin: 'Mahaweli', lat: 7.269, lon: 80.596 },
  { id: 'mahaweli-manampitiya', river: 'Mahaweli Ganga', near: 'Manampitiya', basin: 'Mahaweli', lat: 7.913, lon: 81.089 },
  { id: 'attanagalu-dunamale', river: 'Attanagalu Oya', near: 'Dunamale', basin: 'Attanagalu', lat: 7.1, lon: 80.03 },
  { id: 'maha-badalgama', river: 'Maha Oya', near: 'Badalgama', basin: 'Maha Oya', lat: 7.29, lon: 79.98 },
  { id: 'deduru-moragaswewa', river: 'Deduru Oya', near: 'Moragaswewa', basin: 'Deduru', lat: 7.65, lon: 80.03 },
  { id: 'malwathu-anuradhapura', river: 'Malwathu Oya', near: 'Anuradhapura', basin: 'Malwathu', lat: 8.33, lon: 80.39 },
  { id: 'kirindi-wellawaya', river: 'Kirindi Oya', near: 'Wellawaya', basin: 'Kirindi', lat: 6.73, lon: 81.1 },
  { id: 'gal-inginiyagala', river: 'Gal Oya', near: 'Inginiyagala', basin: 'Gal Oya', lat: 7.22, lon: 81.54 },
]

export const SL_CENTER: [number, number] = [80.7, 7.85]
export const SL_BOUNDS: [[number, number], [number, number]] = [[79.4, 5.75], [82.05, 9.95]]

export const stationById = (id?: string) => STATIONS.find((s) => s.id === id)
export const riverById = (id?: string) => RIVER_POINTS.find((r) => r.id === id)
