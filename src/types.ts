export interface AttendanceRecord {
  id: string;
  name: string;
  photo: string; // base64 data URL
  lat: number;
  lng: number;
  accuracy: number;
  placeName: string | null;
  timestamp: number;
  weekIndex: number;
}

export interface ParticipantStats {
  name: string;
  totalWeeks: number;
  streak: number;
  eligible: boolean;
  isCurrent: boolean;
  lastWeek?: number;
  records: AttendanceRecord[];
}
