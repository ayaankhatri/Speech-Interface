import { STATUS } from "../layout";

interface Props {
  connected: boolean;
  onToggle: () => void;
}

/**
 * Top-left connection pill. Green dot + "Connected" when the hardware link is
 * up, red dot + "Disconnected" otherwise. Clickable to simulate plugging /
 * unplugging the ESP32.
 */
export default function ConnectionStatus({ connected, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={connected ? "Click to disconnect" : "Click to connect"}
      className="absolute flex items-center gap-2 outline-none"
      style={{ left: STATUS.dot.left, top: STATUS.label.top }}
    >
      <span
        className={`inline-block size-[17px] rounded-full border-2 shadow-[4px_12px_4px_0px_rgba(0,0,0,0.5)] transition-colors ${
          connected
            ? "bg-status-green border-status-green-edge"
            : "bg-status-red border-status-red-edge"
        }`}
      />
      <span className="font-handjet text-[20px] leading-none text-white">
        {connected ? "Connected" : "Disconnected"}
      </span>
    </button>
  );
}
