import settingsIcon from '@/assets/settingsIcon.svg';
import './SettingsButton.css';

interface SettingsButtonProps {
  onClick?: () => void;
}

export default function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <div className="settings-button-container">
      <button className="settings-icon-button" onClick={onClick}>
        <img src={settingsIcon} alt="Settings" />
      </button>
    </div>
  );
}
