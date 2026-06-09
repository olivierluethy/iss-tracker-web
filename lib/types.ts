export type ISSPosition = {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: number;
  visibility: "daylight" | "eclipsed";
  footprint: number;
  solar_lat: number;
  solar_lon: number;
};

export type GeoLocation = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

export type PassEvent = {
  riseTime: number;
  setTime: number;
  durationSeconds: number;
  maxElevation: number;
  riseAzimuth: number;
  setAzimuth: number;
};
