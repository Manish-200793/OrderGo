import { Link } from 'react-router-dom';
import { ShoppingBag, Zap, QrCode, BarChart3, ArrowRight, Star, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const FEATURES = [
  { icon: <ShoppingBag size={32} />, title: 'Easy Ordering', desc: 'Browse the menu, add items to cart, and place your order in seconds.' },
  { icon: <Zap size={32} />, title: 'Skip the Queue', desc: 'No more waiting in long lines. Order from anywhere on campus.' },
  { icon: <QrCode size={32} />, title: 'QR Pickup', desc: 'Get a unique QR code for each order. Just scan and collect.' },
  { icon: <Clock size={32} />, title: 'Live Tracking', desc: 'Track your order status in real-time from preparation to ready.' },
  { icon: <Star size={32} />, title: 'Rate & Review', desc: 'Share your feedback and help improve the canteen experience.' },
  { icon: <BarChart3 size={32} />, title: 'Smart Picks', desc: 'AI-powered recommendations based on popular items and your taste.' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-text animate-fade-in-up">
            <span className="hero-badge">🚀 College Canteen, Reimagined</span>
            <h1 className="hero-title">
              Order Food <br />
              <span className="hero-gradient">Without the Wait</span>
            </h1>
            <p className="hero-subtitle">
              Skip the queue, order from your phone, and pick up when it's ready. 
              Fast, simple, and delicious.
            </p>
            <div className="hero-actions">
              <Link to={isAuthenticated ? '/menu' : '/register'} className="btn btn-primary btn-lg">
                {isAuthenticated ? 'Browse Menu' : 'Get Started'}
                <ArrowRight size={20} />
              </Link>
              <Link to="/menu" className="btn btn-secondary btn-lg">
                View Menu
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>20+</strong>
                <span>Menu Items</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <strong>4.8</strong>
                <span>Avg Rating</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <strong>~5min</strong>
                <span>Avg Wait</span>
              </div>
            </div>
          </div>
          <div className="hero-visual animate-fade-in">
            <div className="hero-card-stack">
              <div className="hero-float-card card-1">
                <span>🍕</span>
                <div><strong>Order Placed</strong><small>Just now</small></div>
              </div>
              <div className="hero-float-card card-2">
                <span>👨‍🍳</span>
                <div><strong>Preparing...</strong><small>Your Veg Thali</small></div>
              </div>
              <div className="hero-float-card card-3">
                <span>✅</span>
                <div><strong>Ready!</strong><small>Counter #3</small></div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-glow" />
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header text-center animate-fade-in-up">
            <h2 className="section-title">Why <span className="text-gradient">OrderGo</span>?</h2>
            <p className="section-subtitle">Everything you need for a seamless canteen experience</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className={`feature-card glass-card animate-fade-in-up stagger-${idx + 1}`}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container text-center">
          <div className="cta-card glass-card animate-fade-in-up">
            <h2>Ready to skip the queue?</h2>
            <p>Join hundreds of students already using OrderGo</p>
            <Link to={isAuthenticated ? '/menu' : '/register'} className="btn btn-primary btn-lg">
              {isAuthenticated ? 'Order Now' : 'Create Free Account'}
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© 2024 OrderGo. Built for campus life.</p>
        </div>
      </footer>
    </div>
  );
}
