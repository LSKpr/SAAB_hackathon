import type { DefenseStation, Side, Threat } from "../types";

/** Player IADS (Country Y) in default Boreal defense scenarios. */
export const DEFAULT_DEFENDER_STATION_SIDE: Side = "south";

/** Outbound munitions from Country X (north) toward southern targets. */
export const DEFAULT_THREAT_LAUNCH_SIDE: Side = "north";

/** Y below this (km) is treated as northern launch when `launchSide` is omitted. */
const BOREAL_FROM_Y_IS_NORTH_KM = 650;

export function inferThreatLaunchSide(
  fromKm: { x: number; y: number },
  _toKm: { x: number; y: number },
): Side {
  void _toKm;
  return fromKm.y < BOREAL_FROM_Y_IS_NORTH_KM ? "north" : "south";
}

export function stationSide(station: DefenseStation): Side {
  return station.side ?? DEFAULT_DEFENDER_STATION_SIDE;
}

export function threatLaunchSide(threat: Threat): Side {
  return threat.launchSide ?? DEFAULT_THREAT_LAUNCH_SIDE;
}

/**
 * Only the defending coalition engages inbound tracks. Batteries on the
 * attacker's territory do not fire on their own outbound weapons.
 */
export function stationMayEngageThreat(
  station: DefenseStation,
  threat: Threat,
): boolean {
  return stationSide(station) !== threatLaunchSide(threat);
}
