import './UnavailableOverlay.css';

export function UnavailableOverlay() {
  return (
    <div className="unavailable-panel">
      <h3>Все серверы недоступны</h3>
      <p>
        Сейчас нет активных, работающих каналов связи. Пожалуйста, не покидайте
        страницу, как только они появятся — все снова заработает!
      </p>
    </div>
  );
}
