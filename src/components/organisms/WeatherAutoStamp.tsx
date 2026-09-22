"use client";

/**
 * Captures the weather where the supervisor is standing.
 *
 * The browser has the location and the server has the API key, so it takes
 * both: geolocate, ask our `/weather` for that point, hand the reading up to
 * the form, which sends it with the entry. The server cannot do this alone
 * -- a job's address is a postal address, not a set of coordinates, and one
 * job can cover several lots.
 *
 * Every failure is quiet. Location can be refused, the service may not be
 * configured, the network may be gone -- and none of that may stop somebody
 * filing the day's diary. The entry simply saves without a stamp.
 */
import { AlertCircle, CloudSun, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/Button";
import type { WeatherDto } from "@/lib/api/types";

type Status = "locating" | "fetching" | "ok" | "unavailable" | "no-location";

/** The fields the create request carries, flattened onto the entry. */
export type CapturedWeather = Pick<
  WeatherDto,
  | "locationName"
  | "locationLat"
  | "locationLng"
  | "temperature"
  | "weatherCondition"
  | "weatherIcon"
  | "windSpeedKmh"
  | "rainfallMm"
  | "sunriseTime"
  | "sunsetTime"
>;

export function WeatherAutoStamp({
  onChange,
}: {
  onChange: (weather: CapturedWeather | null) => void;
}) {
  const [status, setStatus] = useState<Status>("locating");
  const [reading, setReading] = useState<CapturedWeather | null>(null);
  const [message, setMessage] = useState("");

  const fetchFor = useCallback(
    async (lat: number, lon: number) => {
      setStatus("fetching");
      try {
        const weather = await api.get<WeatherDto>(`/weather?lat=${lat}&lon=${lon}`);
        setReading(weather);
        setStatus("ok");
        onChange(weather);
      } catch (cause) {
        setMessage(
          cause instanceof ApiError ? cause.message : "The weather service did not answer.",
        );
        setStatus("unavailable");
        onChange(null);
      }
    },
    [onChange],
  );

  const locate = useCallback(() => {
    setStatus("locating");
    setReading(null);

    if (typeof navigator === "undefined" || navigator.geolocation === undefined) {
      setStatus("no-location");
      onChange(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => void fetchFor(position.coords.latitude, position.coords.longitude),
      () => {
        // Refused, or unavailable. The legacy fell back to an IP lookup
        // against a third party; that sends the user's address to someone
        // outside this system for a field nobody has to fill in, so it is
        // not carried across.
        setStatus("no-location");
        onChange(null);
      },
      { timeout: 8000, maximumAge: 300_000 },
    );
  }, [fetchFor, onChange]);

  useEffect(() => {
    locate();
  }, [locate]);

  const shell =
    "flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs";

  if (status === "locating" || status === "fetching") {
    return (
      <p className={shell} role="status" aria-live="polite">
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
        {status === "locating" ? "Finding where you are…" : "Checking the weather…"}
      </p>
    );
  }

  if (status === "ok" && reading !== null) {
    return (
      <p className={shell} role="status" aria-live="polite">
        <CloudSun className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="font-medium">
          {reading.weatherIcon ?? ""} {reading.weatherCondition ?? "Recorded"}
          {reading.temperature !== null && ` ${reading.temperature}°C`}
        </span>
        {reading.locationName !== null && (
          <span className="text-muted-foreground">{reading.locationName}</span>
        )}
        <span className="ml-auto text-muted-foreground">Recorded with this entry</span>
      </p>
    );
  }

  return (
    <div className={shell}>
      <AlertCircle className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="text-muted-foreground">
        {status === "no-location"
          ? "Location unavailable — the entry saves without the weather."
          : (message === "" ? "Weather unavailable." : message)}
      </span>
      <Button variant="ghost" size="sm" className="ml-auto h-6" onClick={locate}>
        <RefreshCw className="h-3 w-3" aria-hidden="true" /> Try again
      </Button>
    </div>
  );
}
