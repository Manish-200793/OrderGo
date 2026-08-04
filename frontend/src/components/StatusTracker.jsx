import './StatusTracker.css';

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: '📋' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'ready', label: 'Ready', icon: '✅' },
  { key: 'completed', label: 'Picked Up', icon: '🎉' },
];

export default function StatusTracker({ status }) {
  const currentIndex = STEPS.findIndex(s => s.key === status);
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="status-tracker cancelled">
        <div className="status-cancelled-msg">
          <span className="status-icon-large">❌</span>
          <span>Order Cancelled</span>
        </div>
      </div>
    );
  }

  return (
    <div className="status-tracker">
      <div className="status-steps">
        {STEPS.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={step.key} className={`status-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="status-dot">
                <span className="status-icon">{step.icon}</span>
                {isCurrent && <span className="status-pulse" />}
              </div>
              <span className="status-label">{step.label}</span>
              {index < STEPS.length - 1 && <div className={`status-line ${index < currentIndex ? 'filled' : ''}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
