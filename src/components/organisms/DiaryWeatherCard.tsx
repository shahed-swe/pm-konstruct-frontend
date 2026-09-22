"use client";

/**
 * The weather as it was on site that day.
 *
 * Frozen at the moment the entry was written and never refreshed: it is a
 * record of conditions, not a forecast. That is why a rained-out day still
 * reads as rain a month later when somebody is arguing about a delay.
 *
 * Two sources, because the product has had two. Newer entries carry the
 * reading on the entry itself; older ones have a separate snapshot row.
 */
import { CloudSun, Droplets, MapPin, Sunrise, Sunset, Thermometer, Wind } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import type { DiaryEntryDto, WeatherSnapshotDto } from "@/lib/api/types";

function Reading({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}

export function DiaryWeatherCard({
  entry,
  snapshot,
}: {
  entry: DiaryEntryDto;
  snapshot: WeatherSnapshotDto | null | undefined;
}) {
  // The entry's own stamp wins: it is the one written at the time. The
  // snapshot row is the older shape, and carries fewer fields -- no location,
  // no sunrise -- so those simply do not appear for an older entry.
  const locationName = entry.locationName;
  const condition = entry.weatherCondition ?? snapshot?.conditions ?? null;
  const temperature = entry.temperature ?? snapshot?.temperatureC ?? null;
  const wind = entry.windSpeedKmh ?? snapshot?.windSpeedKmh ?? null;
  const rain = entry.rainfallMm;
  const rainText = snapshot?.rain ?? null;
  const sunrise = entry.sunriseTime;
  const sunset = entry.sunsetTime;

  const hasAnything =
    locationName !== null ||
    condition !== null ||
    temperature !== null ||
    wind !== null ||
    rain !== null ||
    rainText !== null;

  if (!hasAnything) return null;

  return (
    <Card>
      <CardHeader className="border-b px-4 py-2.5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CloudSun className="h-4 w-4 text-primary" aria-hidden="true" /> Conditions on site
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {locationName !== null && (
            <Reading icon={<MapPin className="h-4 w-4" />} label="Location" value={locationName} />
          )}
          {condition !== null && (
            <Reading
              icon={<CloudSun className="h-4 w-4" />}
              label="Weather"
              value={`${entry.weatherIcon ?? ""} ${condition}`.trim()}
            />
          )}
          {temperature !== null && (
            <Reading
              icon={<Thermometer className="h-4 w-4" />}
              label="Temperature"
              value={`${temperature}°C`}
            />
          )}
          {wind !== null && (
            <Reading icon={<Wind className="h-4 w-4" />} label="Wind" value={`${wind} km/h`} />
          )}
          {rain !== null ? (
            <Reading icon={<Droplets className="h-4 w-4" />} label="Rainfall" value={`${rain} mm`} />
          ) : (
            rainText !== null && (
              <Reading icon={<Droplets className="h-4 w-4" />} label="Rain" value={rainText} />
            )
          )}
          {sunrise !== null && (
            <Reading icon={<Sunrise className="h-4 w-4" />} label="Sunrise" value={sunrise} />
          )}
          {sunset !== null && (
            <Reading icon={<Sunset className="h-4 w-4" />} label="Sunset" value={sunset} />
          )}
        </dl>

        <p className="mt-3 text-xs text-muted-foreground">
          Recorded when the entry was written, and never updated since.
        </p>
      </CardContent>
    </Card>
  );
}
