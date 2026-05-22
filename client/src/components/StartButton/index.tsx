import { useConnectionState } from "@/hooks/useConnectionState";
import { useTexts } from "@/hooks/useTexts";
import { IconArrowRight } from "@tabler/icons-react";

interface StartGameButtonProps {
  onGameStarted?: () => void;
  onGameEnded?: () => void;
  isGameEnded?: boolean;
}

export function StartGameButton({
  onGameStarted,
  onGameEnded,
  isGameEnded,
}: StartGameButtonProps) {
  const { isConnecting, isDisconnecting, toggleConnection } =
    useConnectionState(onGameStarted, onGameEnded);
  const { buttonText } = useTexts();

  // Show spinner during connection process
  const showSpinner = isConnecting;
  const btnText = isGameEnded ? buttonText.RESTART : buttonText.START;

  return (
    <div className="flex justify-center">
      <button
        className="styled-button"
        onClick={toggleConnection}
        disabled={isConnecting || isDisconnecting}
      >
        <>
          <span className="styled-button-text">
            {isConnecting ? buttonText.CONNECTING : btnText}
          </span>
          <span className="styled-button-icon">
            {showSpinner ? (
              <span className="spinner"></span>
            ) : (
              <IconArrowRight size={16} strokeWidth={3} />
            )}
          </span>
        </>
      </button>
    </div>
  );
}
