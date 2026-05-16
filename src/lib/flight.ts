// Flight lookup — env-aware. Real AviationStack if AVIATIONSTACK_API_KEY is set,
// deterministic mock otherwise. The mock is keyed by flight number so the demo
// stays consistent across reruns.

export interface FlightStatus {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  scheduledArrival: string;
  estimatedArrival: string;
  status: "on-time" | "delayed" | "landed" | "cancelled";
  delayMinutes?: number;
}

const MOCK_FLIGHTS: Record<string, FlightStatus> = {
  UA857: {
    flightNumber: "UA857",
    airline: "United",
    origin: "HKG",
    destination: "SFO",
    scheduledArrival: "2026-05-16T15:42:00-07:00",
    estimatedArrival: "2026-05-16T15:24:00-07:00",
    status: "on-time",
    delayMinutes: -18,
  },
  CX870: {
    flightNumber: "CX870",
    airline: "Cathay Pacific",
    origin: "HKG",
    destination: "SFO",
    scheduledArrival: "2026-05-16T15:00:00-07:00",
    estimatedArrival: "2026-05-16T15:12:00-07:00",
    status: "delayed",
    delayMinutes: 12,
  },
};

function genericMock(flightNumber: string): FlightStatus {
  return {
    flightNumber,
    airline: "Unknown carrier",
    origin: "—",
    destination: "—",
    scheduledArrival: new Date().toISOString(),
    estimatedArrival: new Date().toISOString(),
    status: "on-time",
  };
}

export async function flightLookup(
  flightNumber: string,
): Promise<FlightStatus> {
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!key) {
    return MOCK_FLIGHTS[flightNumber.toUpperCase()] ?? genericMock(flightNumber);
  }

  const url = `http://api.aviationstack.com/v1/flights?access_key=${key}&flight_iata=${encodeURIComponent(flightNumber)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`AviationStack ${res.status}`);
    const json = (await res.json()) as {
      data?: Array<{
        flight?: { iata?: string };
        airline?: { name?: string };
        departure?: { iata?: string; scheduled?: string };
        arrival?: { iata?: string; scheduled?: string; estimated?: string; delay?: number };
        flight_status?: string;
      }>;
    };
    const f = json.data?.[0];
    if (!f) {
      return MOCK_FLIGHTS[flightNumber.toUpperCase()] ?? genericMock(flightNumber);
    }
    const status = (f.flight_status as FlightStatus["status"]) ?? "on-time";
    return {
      flightNumber: f.flight?.iata ?? flightNumber,
      airline: f.airline?.name ?? "Unknown carrier",
      origin: f.departure?.iata ?? "—",
      destination: f.arrival?.iata ?? "—",
      scheduledArrival: f.arrival?.scheduled ?? new Date().toISOString(),
      estimatedArrival:
        f.arrival?.estimated ?? f.arrival?.scheduled ?? new Date().toISOString(),
      status,
      delayMinutes: f.arrival?.delay,
    };
  } catch {
    return MOCK_FLIGHTS[flightNumber.toUpperCase()] ?? genericMock(flightNumber);
  }
}
