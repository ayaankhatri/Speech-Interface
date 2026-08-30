// Connection light + label, top-left of the phone screen.
interface Props {
  connected: boolean;
  /** When set, the pill becomes a hit target (used on the powered-off screen). */
  onToggle?: () => void;
}

// Wide enough for "Disconnected" at 20px, starting at the dot.
const HIT_AREA = { left: 8.5, top: 13, width: 115, height: 27 };

export default function MobileStatus({ connected, onToggle }: Props) {
  return (
    <>
      <div
        className={`absolute rounded-full border-2 shadow-[4px_12px_4px_0px_rgba(0,0,0,0.5)] transition-colors ${
          connected ? "border-status-green-edge bg-status-green" : "border-status-red-edge bg-status-red"
        }`}
        style={{ left: 8.5, top: 17, width: 17, height: 17 }}
      />
      <span
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 31.5, top: 15, fontSize: 20 }}
      >
        {connected ? "Connected" : "Disconnected"}
      </span>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={connected ? "Connected" : "Disconnected"}
          className="absolute outline-none"
          style={HIT_AREA}
        />
      )}
    </>
  );
}
