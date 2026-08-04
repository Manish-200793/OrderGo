import { useState, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { menuAPI } from '../services/api';
import MenuCard from '../components/MenuCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { CATEGORY_CONFIG } from '../utils/formatters';
import './Menu.css';

const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '🍽️' },
  ...Object.entries(CATEGORY_CONFIG).map(([key, val]) => ({ key, ...val })),
];

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

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

  if (loading) return <LoadingSpinner text="Loading menu..." />;

  return (
    <div className="menu-page page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Our Menu</h1>
          <p className="page-subtitle">Fresh, delicious food made with love</p>
        </div>

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
      </div>
    </div>
  );
}
