import './LoadingSpinner.css';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner">
        <div className="spinner-ring" />
        <span className="spinner-logo">🍽️</span>
      </div>
      <p className="loading-text">{text}</p>
    </div>
  );
}
