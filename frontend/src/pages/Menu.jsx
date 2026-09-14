import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, LogIn, UserPlus, Dices, X, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { menuAPI } from '../services/api';
import MenuCard from '../components/MenuCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { CATEGORY_CONFIG, formatPrice } from '../utils/formatters';
import './Menu.css';

const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '🍽️' },
  ...Object.entries(CATEGORY_CONFIG).map(([key, val]) => ({ key, ...val })),
];

export default function MenuPage() {
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const [items, setItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  
  // Roulette State
  const [showRoulette, setShowRoulette] = useState(false);
  const [budget, setBudget] = useState('');
  const [rouletteCombo, setRouletteCombo] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    loadMenu();
    loadRecommendations();
  }, []);

  async function loadMenu() {
    try {
      const res = await menuAPI.getItems({ available: 'true' });
      setItems(res.data);
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendations() {
    try {
      const res = await menuAPI.getRecommendations();
      setRecommendations(res.data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    }
  }

  const filtered = items.filter(item => {
    const matchCategory = category === 'all' || item.category === category;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.description?.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const specials = items.filter(item => item.is_daily_special);

  function handleSpinRoulette() {
    const b = parseFloat(budget);
    if (isNaN(b) || b <= 0) return;
    
    setIsSpinning(true);
    setRouletteCombo(null);
    
    setTimeout(() => {
      let validCombos = [];
      
      const availableItems = items.filter(i => i.is_available === 1 || i.is_available === true);
      const mains = availableItems.filter(i => ['breakfast', 'lunch', 'snacks'].includes(i.category));
      const bevs = availableItems.filter(i => i.category === 'beverages');
      const sweets = availableItems.filter(i => i.category === 'desserts');

      // Generate 50 structured combinations
      for (let i = 0; i < 50; i++) {
        let currentCombo = [];
        let currentTotal = 0;

        // Shuffle buckets
        const shuffledMains = [...mains].sort(() => 0.5 - Math.random());
        const shuffledBevs = [...bevs].sort(() => 0.5 - Math.random());
        const shuffledSweets = [...sweets].sort(() => 0.5 - Math.random());

        // Try to add 1 Main
        if (shuffledMains.length > 0) {
          const main = shuffledMains[0];
          let mainCost = parseFloat(main.price);
          let mainItems = [main];
          
          // Force pairing for Paneer Butter Masala
          if (main.name === 'Paneer Butter Masala') {
             const roti = availableItems.find(item => item.name === 'Rumali Roti');
             if (roti) {
               mainItems.push(roti);
               mainCost += parseFloat(roti.price);
             }
          }

          if (currentTotal + mainCost <= b) {
            currentCombo.push(...mainItems);
            currentTotal += mainCost;
          }
        }

        // Try to add 1 Beverage
        if (shuffledBevs.length > 0) {
          const bev = shuffledBevs[0];
          if (currentTotal + parseFloat(bev.price) <= b) {
            currentCombo.push(bev);
            currentTotal += parseFloat(bev.price);
          }
        }

        // Try to add 1 Dessert
        if (shuffledSweets.length > 0) {
          const sweet = shuffledSweets[0];
          if (currentTotal + parseFloat(sweet.price) <= b) {
            currentCombo.push(sweet);
            currentTotal += parseFloat(sweet.price);
          }
        }

        // Fallback: If budget is too low for the structured combo, just find ANY item that fits
        if (currentCombo.length === 0) {
           const anyShuffled = [...availableItems].sort(() => 0.5 - Math.random());
           for (let item of anyShuffled) {
             if (parseFloat(item.price) <= b) {
               currentCombo.push(item);
               currentTotal += parseFloat(item.price);
               break;
             }
           }
        }
        
        // Keep valid combos
        if (currentCombo.length > 0) {
           validCombos.push(currentCombo); 
        }
      }
      
      // Select a random combination from the top tier of valid combos to ensure variety
      if (validCombos.length > 0) {
         // Sort combos by how much budget they utilize
         validCombos.sort((c1, c2) => {
             const t1 = c1.reduce((sum, i) => sum + parseFloat(i.price), 0);
             const t2 = c2.reduce((sum, i) => sum + parseFloat(i.price), 0);
             return t2 - t1;
         });
         
         // Take the top 10 best combos and pick one randomly
         // This prevents Biryani from dominating 100% of the time just because it maxes out the budget
         const topCombos = validCombos.slice(0, 10);
         const randomBest = topCombos[Math.floor(Math.random() * topCombos.length)];
         setRouletteCombo(randomBest);
      } else {
         setRouletteCombo([]);
      }
      
      setIsSpinning(false);
    }, 1200);
  }

  function handleAddComboToCart() {
    if (rouletteCombo) {
      rouletteCombo.forEach(item => addItem(item));
      setShowRoulette(false);
      setRouletteCombo(null);
    }
  }

  if (loading) return <LoadingSpinner text="Loading menu..." />;

  return (
    <div className="menu-page page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Our Menu</h1>
          <p className="page-subtitle">Fresh, delicious food made with love</p>
        </div>

        {/* Guest Browsing Notice */}
        {!isAuthenticated && (
          <div className="guest-menu-banner glass-card animate-fade-in-up">
            <div className="guest-banner-info">
              <div className="guest-banner-icon">🍽️</div>
              <div>
                <h3 className="guest-banner-title">Browsing as Guest</h3>
                <p className="guest-banner-desc">Sign in or create an account to view prices, customize items, and place orders.</p>
              </div>
            </div>
            <div className="guest-banner-actions">
              <Link to="/login" className="btn btn-secondary btn-sm">
                <LogIn size={15} /> Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                <UserPlus size={15} /> Sign Up
              </Link>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="menu-search-bar glass-card">
          <Search size={20} className="search-icon" />
          <input
            id="menu-search"
            type="text"
            className="search-input"
            placeholder="Search for dishes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`category-tab ${category === cat.key ? 'active' : ''}`}
              onClick={() => setCategory(cat.key)}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* AI Recommendations */}
        {category === 'all' && !search && recommendations.length > 0 && (
          <section className="menu-section animate-fade-in">
            <h2 className="menu-section-title">
              <Sparkles size={20} /> Recommended For You
            </h2>
            <div className="menu-grid">
              {recommendations.slice(0, 4).map((item, idx) => (
                <div key={item.item_id} className={`animate-fade-in-up stagger-${idx + 1}`}>
                  <MenuCard item={item} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Daily Specials */}
        {category === 'all' && !search && specials.length > 0 && (
          <section className="menu-section animate-fade-in">
            <h2 className="menu-section-title">⭐ Today's Specials</h2>
            <div className="menu-grid">
              {specials.map((item, idx) => (
                <div key={item.item_id} className={`animate-fade-in-up stagger-${idx + 1}`}>
                  <MenuCard item={item} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Menu Items */}
        <section className="menu-section">
          <h2 className="menu-section-title">
            {category === 'all' ? '🍽️ All Items' : `${CATEGORY_CONFIG[category]?.emoji} ${CATEGORY_CONFIG[category]?.label}`}
            <span className="item-count">{filtered.length} items</span>
          </h2>
          {filtered.length > 0 ? (
            <div className="menu-grid">
              {filtered.map((item, idx) => (
                <div key={item.item_id} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 6)}`}>
                  <MenuCard item={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No items found</h3>
              <p>Try a different search or category</p>
            </div>
          )}
        </section>

        {/* Surprise Me Floating Button */}
        <button className="btn-surprise-float" onClick={() => {
          setShowRoulette(true);
          setRouletteCombo(null);
        }}>
          <Dices size={24} /> Surprise Me!
        </button>

        {/* Surprise Me Modal */}
        {showRoulette && (
          <div className="modal-overlay" onClick={() => {
            setShowRoulette(false);
            setRouletteCombo(null);
          }}>
            <div className="modal-content glass-card roulette-modal" onClick={e => e.stopPropagation()}>
              <button className="btn-close roulette-close" onClick={() => {
                setShowRoulette(false);
                setRouletteCombo(null);
              }}>
                <X size={20} />
              </button>
              
              <div className="roulette-header">
                <h2>🎲 Meal Roulette</h2>
                <p>On a budget? Let us randomly pick a combo for you!</p>
              </div>

              {!rouletteCombo && !isSpinning && (
                <div className="roulette-input-section animate-fade-in">
                  <label className="form-label">What is your maximum budget?</label>
                  <div className="budget-input-wrapper">
                    <span className="rupee-symbol">₹</span>
                    <input 
                      type="number" 
                      className="form-input budget-input" 
                      placeholder="e.g. 100" 
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary w-full mt-lg" onClick={handleSpinRoulette} disabled={!budget || budget <= 0}>
                    Spin the Wheel!
                  </button>
                </div>
              )}

              {isSpinning && (
                <div className="roulette-spinning">
                  <Dices size={48} className="spin-animation" />
                  <p>Finding the perfect combo...</p>
                </div>
              )}

              {rouletteCombo && !isSpinning && (
                <div className="roulette-result animate-scale-in">
                  {rouletteCombo.length > 0 ? (
                    <>
                      <h3>We picked this for you:</h3>
                      <div className="combo-list">
                        {rouletteCombo.map((item, i) => (
                          <div key={i} className="combo-item">
                            <span>{item.name}</span>
                            <strong>{formatPrice(item.price)}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="combo-total">
                        <span>Total:</span>
                        <strong>{formatPrice(rouletteCombo.reduce((sum, item) => sum + parseFloat(item.price), 0))}</strong>
                      </div>
                      
                      <div className="roulette-actions mt-lg">
                        <button className="btn btn-secondary" onClick={handleSpinRoulette}>
                          Spin Again
                        </button>
                        <button className="btn btn-primary" onClick={handleAddComboToCart}>
                          <PlusCircle size={18} /> Add Combo to Cart
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="roulette-fail animate-fade-in">
                      <p>Oops! Your budget is too low to afford anything on the menu right now.</p>
                      <button className="btn btn-primary mt-md" onClick={() => setRouletteCombo(null)}>Try a higher budget</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
