import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import AdminPanel from './AdminPanel'; 
import logo from './assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE || '';
const apiUrl = (path) => `${API_BASE}${path}`;
const assetUrl = (path) => {
  if (!path) return path;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
};

// --- 1. АЙМАҚТАР ТІЗІМІ ---
const regions = [
  "Астана", "Алматы қаласы", "Шымкент", 
  "Абай облысы", "Ақмола облысы", "Ақтөбе облысы", "Алматы облысы", 
  "Атырау облысы", "Батыс Қазақстан облысы", "Жамбыл облысы", 
  "Жетісу облысы", "Қарағанды облысы", "Қостанай облысы", 
  "Қызылорда облысы", "Маңғыстау облысы", "Павлодар облысы", 
  "Солтүстік Қазақстан облысы", "Түркістан облысы", "Ұлытау облысы", 
  "Шығыс Қазақстан облысы"
];

// --- 2. ЖЕКЕ ПРОФИЛЬ БЕТІ (ProfilePage) ---
const ProfilePage = ({ user, onBack, setUser }) => {
  const [favorites, setFavorites] = useState([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardData, setCardData] = useState({ number: '', date: '', cvv: '' });

  useEffect(() => {
    if (user && user.id) {
      axios.get(apiUrl(`/api/favorites/${user.id}`))
        .then(res => setFavorites(res.data))
        .catch(err => console.log("Таңдаулыларды алу қатесі"));
    }
  }, [user]);

  const handleBuyRights = async () => {
    if ((user.balance || 0) < 5000) {
      return alert("Баланста ақша жеткіліксіз! (Кемінде 5000 ₸ керек)");
    }
    try {
      const res = await axios.post(apiUrl('/api/users/buy-rights'), { user_id: user.id });
      alert(res.data.message);
      setUser(res.data.user);
    } catch (err) {
      alert(err.response?.data?.message || "Қате орын алды");
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (cardData.number.length < 16) return alert("Карта нөмірі қате!");
    try {
      const res = await axios.post(apiUrl('/api/users/add-balance'), { 
        user_id: user.id, 
        amount: 5000 
      });
      setUser({ ...user, balance: res.data.balance });
      setShowCardModal(false);
      setCardData({ number: '', date: '', cvv: '' });
      alert("Төлем сәтті өтті! Балансқа 5000 ₸ қосылды.");
    } catch (err) {
      alert("Сервермен байланыс қатесі");
    }
  };

  return (
    <div style={{ padding: '40px 10%', backgroundColor: '#f4f4f2', minHeight: '100vh' }}>
      <button onClick={onBack} style={logoutBtnStyle}>← БАСТЫ БЕТКЕ ҚАЙТУ</button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginTop: '30px' }}>
        <div style={articleCardStyle}>
          <h2 style={sectionTitle}>Менің профилім</h2>
          <div style={{ marginTop: '20px', lineHeight: '2' }}>
            <p><b>Аты-жөні:</b> {user.fullname}</p>
            <p><b>Email:</b> {user.email}</p>
            <p><b>Баланс:</b> <span style={{ color: '#b8860b', fontSize: '1.5rem', fontWeight: 'bold' }}>{user.balance || 0} ₸</span></p>
            <p><b>Мәртебесі:</b> {user.has_author_rights ? <span style={{color: '#b8860b', fontWeight: 'bold'}}>Автор </span> : "Оқырман"}</p>
          </div>
          <button onClick={() => setShowCardModal(true)} style={{...btnStyle, background: '#1a1a1a', marginTop: '20px'}}>БАЛАНС ТОЛТЫРУ (+5000 ₸)</button>
          {!user.has_author_rights && (
            <button onClick={handleBuyRights} style={{...btnStyle, marginTop: '10px'}}>АВТОРЛЫҚ ҚҰҚЫҚТЫ САТЫП АЛУ (5000 ₸)</button>
          )}
        </div>

        <div>
          <h2 style={sectionTitle}>Сақталған мақалалар (🔖)</h2>
          {favorites.length > 0 ? favorites.map(a => (
            <div key={a.id} style={{...articleCardStyle, padding: '25px', marginBottom: '20px'}}>
               <span style={regionTagStyle}>{a.region}</span>
               <h3 style={{...articleTitle, fontSize: '1.2rem'}}>{a.title}</h3>
               <p style={{...articleContent, fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{a.content}</p>
               <div style={{...articleMeta, marginTop: '10px'}}>
                  <span>Авторы: <b>{a.author_name}</b></span>
                  <span>{new Date(a.created_at).toLocaleDateString('kk-KZ')}</span>
               </div>
            </div>
          )) : <p style={{color: '#999', marginTop: '20px'}}>Әзірге сақталған мақалалар жоқ.</p>}
        </div>
      </div>

      {showCardModal && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, width: '380px'}}>
            <h3 style={{textAlign: 'center', marginBottom: '20px'}}>Карта мәліметтері</h3>
            <form onSubmit={handlePayment}>
              <label style={labelStyle}>Карта нөмірі:</label>
              <input style={inputStyle} placeholder="0000 0000 0000 0000" maxLength="16" required value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value})} />
              <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                <div style={{flex: 1}}><label style={labelStyle}>Мерзімі:</label><input style={inputStyle} placeholder="MM/YY" maxLength="5" required value={cardData.date} onChange={e => setCardData({...cardData, date: e.target.value})} /></div>
                <div style={{flex: 1}}><label style={labelStyle}>CVV:</label><input style={inputStyle} type="password" placeholder="***" maxLength="3" required value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value})} /></div>
              </div>
              <button type="submit" style={btnStyleBlack}>ТӨЛЕУ (5000 ₸)</button>
              <button type="button" onClick={() => setShowCardModal(false)} style={closeBtnStyle}>Бас тарту</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3. ЕРЕЖЕЛЕР БЕТІ ---
const RulesPage = ({ onBack }) => (
  <div style={{ padding: '50px 15%', backgroundColor: '#fff', minHeight: '100vh', lineHeight: '1.8', color: '#333' }}>
    <button onClick={onBack} style={{ marginBottom: '30px', cursor: 'pointer', border: 'none', background: '#b8860b', color: '#fff', padding: '10px 20px', fontWeight: 'bold' }}>← БАСТЫ БЕТКЕ ҚАЙТУ</button>
    <h1 style={{ borderBottom: '2px solid #b8860b', paddingBottom: '10px', fontSize: '1.8rem' }}>Сайт ережесі. Пайдаланушылық келісім</h1>
    <p><b>Осы құжат «INSIGHT» веб-порталына материалдар жариялау шарттарын белгілейді...</b></p>
    <p>1. Жалпы ережелер...</p>
    <p>2. Порталда материал жариялау талаптары..</p>
  </div>
);

// --- 4. БАЙЛАНЫС БЕТІ ---
const ContactPage = ({ onBack }) => (
  <div style={{ padding: '50px 15%', backgroundColor: '#fff', minHeight: '100vh', lineHeight: '2', color: '#333' }}>
    <button onClick={onBack} style={{ marginBottom: '30px', cursor: 'pointer', border: 'none', background: '#b8860b', color: '#fff', padding: '10px 20px', fontWeight: 'bold' }}>← БАСТЫ БЕТКЕ ҚАЙТУ</button>
    <h1 style={{ borderBottom: '2px solid #b8860b', paddingBottom: '10px', fontSize: '1.8rem' }}>Бізбен байланыс</h1>
    <p>Қазақстан Республикасы, Астана қаласы, Д. Қонаев көшесі, 4-үй.</p>
    <p>Байланыс нөмірі: <a href="tel:+77172757500">+7 (7172) 757-500</a></p>
  </div>
);

const cityMapping = {
  "Астана": "Astana",
  "Алматы қаласы": "Almaty",
  "Шымкент": "Shymkent",
  "Абай облысы": "Semey",
  "Ақмола облысы": "Kokshetau",
  "Ақтөбе облысы": "Aktobe",
  "Алматы облысы": "Taldykorgan",
  "Атырау облысы": "Atyrau",
  "Батыс Қазақстан облысы": "Uralsk",
  "Жамбыл облысы": "Taraz",
  "Жетісу облысы": "Taldykorgan",
  "Қарағанды облысы": "Karaganda",
  "Қостанай облысы": "Kostanay",
  "Қызылорда облысы": "Kyzylorda",
  "Маңғыстау облысы": "Aktau",
  "Павлодар облысы": "Pavlodar",
  "Солтүстік Қазақстан облысы": "Petropavl",
  "Түркістан облысы": "Turkistan",
  "Ұлытау облысы": "Zhezkazgan",
  "Шығыс Қазақстан облысы": "Oskemen"
};

// --- 5. НЕГІЗГІ APP КОМПОНЕНТІ ---
function App() {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("Барлық жаңалықтар");
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('main'); 
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [authData, setAuthData] = useState({ email: '', password: '', fullname: '' });
  const [formData, setFormData] = useState({ title: '', content: '', region: 'Астана', image: null, agreed: false });
  const [weather, setWeather] = useState("...");
  const [usdRate] = useState("448.5");
  const [searchTerm, setSearchTerm] = useState("");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  const WEATHER_API_KEY = "297a27d3a5cdd2a98def0a940e388b4f";

  const fetchArticles = useCallback(async () => {
    try {
      const res = await axios.get(apiUrl('/api/articles'));
      setArticles(res.data || []);
    } catch (err) { console.error("Сервер қатесі:", err); }
  }, []);

  const fetchComments = useCallback(async (articleId) => {
    try {
      const res = await axios.get(apiUrl(`/api/articles/${articleId}/comments`));
      setComments(prev => ({ ...prev, [articleId]: res.data }));
    } catch (err) { console.error("Пікірлер қатесі", err); }
  }, []);

  const fetchNotifications = useCallback(async (userId) => {
    try {
      const res = await axios.get(apiUrl(`/api/notifications/${userId}`));
      setNotifications(res.data || []);
    } catch (err) { console.log("Хабарлама алу қатесі"); }
  }, []);
// 1. Бет жүктелгенде мақалаларды серверден бірінші рет алу
useEffect(() => {
  fetchArticles();
}, [fetchArticles]);

// 2. Іздеу немесе аймақ өзгергенде filteredArticles-ті жаңарту
useEffect(() => {
  const filtered = articles.filter(a => {
    const matchesRegion = selectedRegion === "Барлық жаңалықтар" || a.region === selectedRegion;
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRegion && matchesSearch;
  });
  setFilteredArticles(filtered);
}, [articles, selectedRegion, searchTerm]);
  useEffect(() => {
  // Егер аймақ таңдалмаса, Астананы ал, әйтпесе сөздіктен ағылшынша атын ал
  const cityName = selectedRegion === "Барлық жаңалықтар" 
    ? "Astana" 
    : (cityMapping[selectedRegion] || "Astana");

  axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${WEATHER_API_KEY}&units=metric`)
    .then(res => {
      setWeather(`${Math.round(res.data.main.temp)}°C`);
    })
    .catch((err) => {
      console.error("Weather error:", err);
      setWeather("..."); // Қате болса көп нүкте қалады
    });
}, [selectedRegion]);
// Пайдаланушы кірген кезде оның хабарламаларын жүктейміз
useEffect(() => {
  if (user && user.id) {
    fetchNotifications(user.id);
    
    // Әр 30 секунд сайын жаңа хабарлама бар-жоғын тексеріп тұру (опционалды)
    const interval = setInterval(() => fetchNotifications(user.id), 30000);
    return () => clearInterval(interval);
  }
}, [user, fetchNotifications]);

  const handleAuth = (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? 'login' : 'register';
    axios.post(apiUrl(`/api/${endpoint}`), authData)
      .then(res => {
        if (authMode === 'login') {
          setUser(res.data.user);
          setShowAuth(false);
          if (res.data.user.is_admin) setCurrentPage('admin');
        } else {
          setAuthMode('login');
        }
      })
      .catch(err => alert("Қате!"));
  };

  const handlePost = async (e) => {
  e.preventDefault();
  
  // 1. Тексерулер
  if (!formData.agreed) return alert("Сайт ережелерімен келісуіңіз керек!");
  if (!user?.has_author_rights) return alert("Мақала жариялау үшін авторлық құқық сатып алуыңыз қажет!");

  const data = new FormData();
  Object.keys(formData).forEach(key => data.append(key, formData[key]));
  data.append('author_name', user.fullname);
  data.append('user_id', user.id);

  try {
    // 2. Серверге жіберу
    await axios.post(apiUrl('/api/articles'), data);
    
    // 3. ПАЙДАЛАНУШЫҒА ХАБАРЛАМА ШЫҒАРУ
    alert("Құттықтаймыз! Мақалаңыз сәтті жіберілді. Админ тексеріп, мақұлдаған соң сайтта жарияланады.");
    
    // 4. Форманы тазарту және тізімді жаңарту
    setFormData({ title: '', content: '', region: 'Астана', image: null, agreed: false });
    fetchArticles(); 
    
  } catch (err) {
    console.error("Жіберу қатесі:", err);
    alert("Мақаланы жіберу кезінде қате кетті. Қайта көріңіз.");
  }
};

  const handleDelete = (id) => {
    if (window.confirm("Бұл мақаланы өшіргіңіз келе ме?")) {
      axios.delete(apiUrl(`/api/articles/${id}`)).then(() => fetchArticles());
    }
  };

  const handleLike = async (articleId) => {
    if (!user) return alert("Бетбелгілерге сақтау үшін жүйеге кіріңіз!");
    try {
      await axios.post(apiUrl('/api/favorites'), { user_id: user.id, article_id: articleId });
      alert("Мақала сәтті сақталды! 🔖");
    } catch (err) { alert("Сақтау мүмкін болмады"); }
  };

  const handleView = async (id) => {
    try { await axios.put(apiUrl(`/api/articles/${id}/view`)); fetchArticles(); } catch (err) {}
  };

  if (currentPage === 'admin' && user?.is_admin) return <AdminPanel onBack={() => setCurrentPage('main')} />;
  if (currentPage === 'rules') return <RulesPage onBack={() => setCurrentPage('main')} />;
  if (currentPage === 'contact') return <ContactPage onBack={() => setCurrentPage('main')} />;
  if (currentPage === 'profile' && user) return <ProfilePage user={user} setUser={setUser} onBack={() => setCurrentPage('main')} />;

  return (
    <div style={{ fontFamily: '"Playfair Display", serif', backgroundColor: '#f4f4f2', minHeight: '100vh', color: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
      
      <header style={headerStyle}>
        <div style={logoWrapper} onClick={() => { setSelectedRegion("Барлық жаңалықтар"); setCurrentPage('main'); }}>
          <img src={logo} alt="INSIGHT" style={{ height: '80px', objectFit: 'contain', width: 'auto' }} onError={(e) => { e.target.src = "/logo192.png"; }} />
          <div style={logoTexts}>
            <span style={logoMainText}>INSIGHT</span>
            <small style={logoSubText}>ҰЛТТЫҚ АҚПАРТТЫҚ ПОРТАЛ</small>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <span onClick={() => setShowNotif(!showNotif)} style={{ cursor: 'pointer', fontSize: '1.4rem' }}>
                  🔔 {notifications.length > 0 && (
                    <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
                      {notifications.length}
                    </span>
                  )}
                </span>
                
                {showNotif && (
                  <div style={{ position: 'absolute', top: '35px', right: '0', width: '250px', background: 'white', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', padding: '15px', zIndex: 100, borderRadius: '8px', color: 'black' }}>
                    <h4 style={{margin: '0 0 10px 0', fontSize: '14px'}}>Хабарламалар</h4>
                    {notifications.length === 0 ? <p style={{fontSize: '12px'}}>Жаңа хабарлама жоқ</p> : 
                      notifications.map(n => (
                        <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <span>{n.message}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {user.is_admin && (
                <button onClick={() => setCurrentPage('admin')} style={{...loginBtnStyle, background: '#b8860b'}}>АДМИН ПАНЕЛЬ</button>
              )}
              <span onClick={() => setCurrentPage('profile')} style={{ fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', color: '#b8860b' }}>
                 {user.fullname}
              </span>
              <button onClick={() => setUser(null)} style={logoutBtnStyle}>Шығу</button>
            </div>
          ) : (
            <button onClick={() => { setAuthMode('login'); setShowAuth(true); }} style={loginBtnStyle}>Кіру</button>
          )}
        </div>
      </header>

      <div style={infoPanelStyle}>
        <div style={statsWrapperStyle}>
          <div style={statItemStyle}>{selectedRegion === "Барлық жаңалықтар" ? "Қазақстан" : selectedRegion}: <b style={{color: '#b8860b'}}>{weather}</b></div>
          <div style={statDividerStyle}>|</div>
          <div style={statItemStyle}> USD: <b style={{color: '#1a1a1a'}}>{usdRate} ₸</b></div>
        </div>
        <div style={searchWrapperStyle}>
          <input type="text" placeholder="Жаңалық іздеу..." style={searchInputStyle} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <nav style={subNavStyle}>
        <span style={{ ...menuItemStyle, borderBottom: selectedRegion === "Барлық жаңалықтар" ? '2px solid #b8860b' : '2px solid transparent' }} onClick={() => setSelectedRegion("Барлық жаңалықтар")}>Барлық жаңалықтар</span>
        {regions.map(r => (
          <span key={r} style={{ ...menuItemStyle, borderBottom: selectedRegion === r ? '2px solid #b8860b' : '2px solid transparent' }} onClick={() => setSelectedRegion(r)}>{r}</span>
        ))}
      </nav>

      <main style={{...mainLayout, flex: 1}}>
        <section>
          <h2 style={sectionTitle}>{selectedRegion === "Барлық жаңалықтар" ? "Соңғы жаңалықтар" : selectedRegion}</h2>
          {filteredArticles.length > 0 ? filteredArticles.map(a => (
            <div key={a.id} style={articleCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={regionTagStyle}>{a.region}</span>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>👁 {a.views || 0}</span>
                  <span onClick={() => handleLike(a.id)} style={{cursor: 'pointer', fontSize: '1.2rem'}}>🔖</span>
                  {user && user.fullname === a.author_name && (
                    <button onClick={() => handleDelete(a.id)} style={deleteBtnStyle}>Өшіру</button>
                  )}
                </div>
              </div>
              {a.image_url && (
                <img src={assetUrl(a.image_url)} alt="article" onClick={() => handleView(a.id)} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '5px', marginTop: '15px', cursor: 'pointer' }} />
              )}
              <h3 style={{...articleTitle, cursor: 'pointer'}} onClick={() => handleView(a.id)}>{a.title}</h3>
              <p style={articleContent}>{a.content}</p>
              <div style={articleMeta}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span>Авторы: <b>{a.author_name}</b></span>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(a.created_at).toLocaleString('kk-KZ')}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <a href={`https://wa.me/?text=${encodeURIComponent(a.title)}`} target="_blank" rel="noreferrer" style={shareIconStyle}>WA</a>
                  <a href={`https://t.me/share/url?url=${window.location.href}&text=${encodeURIComponent(a.title)}`} target="_blank" rel="noreferrer" style={shareIconStyle}>TG</a>
                </div>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px dotted #ddd', paddingTop: '15px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Пікірлер ({(comments[a.id] || []).length}):</h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '15px' }}>
                  {(comments[a.id] || []).map(comment => (
                    <div key={comment.id} style={{ padding: '8px', backgroundColor: '#f9f9f9', marginBottom: '8px', borderRadius: '8px', borderLeft: '3px solid #b8860b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <b style={{ fontSize: '0.85rem' }}>{comment.author_name}</b>
                        <span style={{ fontSize: '0.7rem', color: '#999' }}>{new Date(comment.created_at).toLocaleString('kk-KZ')}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', margin: '5px 0 0' }}>{comment.content}</p>
                    </div>
                  ))}
                </div>
                {user ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="Пікір жазыңыз..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                    <button style={{ ...btnStyle, width: 'auto' }} onClick={async () => {
                        if (!commentText.trim()) return;
                        try {
                          await axios.post(apiUrl('/api/comments'), { article_id: a.id, user_id: user.id, author_name: user.fullname, content: commentText });
                          setCommentText("");
                          fetchComments(a.id);
                        } catch (err) { alert("Қате!"); }
                    }}>Жіберу</button>
                  </div>
                ) : <p style={{ fontSize: '0.8rem', color: '#888' }}>Пікір қалдыру үшін жүйеге кіріңіз.</p>}
              </div>
            </div>
          )) : <p style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>Жаңалықтар табылмады.</p>}
        </section>

        <aside>
          {user ? (
            <div style={formCardStyle}>
              <h3 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '20px' }}>ЖАҢА МАҚАЛА ЖАЗУ</h3>
              {!user.has_author_rights ? <div style={{color: 'red', fontSize: '0.8rem'}}>Автоp құқығы қажет.</div> : (
                <>
                  <select style={inputStyle} value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input style={inputStyle} placeholder="Тақырып" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  <input type="file" style={inputStyle} onChange={e => setFormData({...formData, image: e.target.files[0]})} />
                  <textarea style={{...inputStyle, height: '120px'}} placeholder="Мәтін..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
                  <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                    <input type="checkbox" checked={formData.agreed} onChange={e => setFormData({...formData, agreed: e.target.checked})} />
                    <span style={{fontSize: '0.7rem'}}>Мәліметтердің дұрыстығын растаймын</span>
                  </div>
                  <button style={btnStyle} onClick={handlePost}>ЖАРИЯЛАУ</button>
                </>
              )}
            </div>
          ) : <div style={loginPromptStyle}><button style={btnStyle} onClick={() => { setAuthMode('login'); setShowAuth(true); }}>Кіру / Тіркелу</button></div>}
        </aside>
      </main>

      <footer style={footerStyle}>
        <div style={footerContentStyle}>
          <div><div style={{ fontWeight: '800', fontSize: '1.2rem' }}>INSIGHT</div></div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span onClick={() => setCurrentPage('rules')} style={{cursor: 'pointer'}}>Ережелер</span>
            <span onClick={() => setCurrentPage('contact')} style={{cursor: 'pointer'}}>Байланыс</span>
          </div>
          <div style={{ fontSize: '0.75rem' }}>&copy; 2026 INSIGHT.</div>
        </div>
      </footer>

      {showAuth && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2>{authMode === 'login' ? 'КІРУ' : 'ТІРКЕЛУ'}</h2>
            <form onSubmit={handleAuth}>
              {authMode === 'register' && <input style={inputStyle} placeholder="Аты-жөні" required value={authData.fullname} onChange={e => setAuthData({...authData, fullname: e.target.value})} />}
              <input style={inputStyle} type="email" placeholder="Email" required value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})} />
              <input style={inputStyle} type="password" placeholder="Құпия сөз" required value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} />
              <button type="submit" style={btnStyleBlack}>{authMode === 'login' ? 'КІРУ' : 'ТІРКЕЛУ'}</button>
              <p onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{cursor:'pointer', textAlign:'center', marginTop:'10px'}}>
                {authMode === 'login' ? 'Тіркелу' : 'Кіруге ауысу'}
              </p>
              <button type="button" onClick={() => setShowAuth(false)} style={closeBtnStyle}>Жабу</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 6. СТИЛЬДЕР (Сенің дизайның сол қалпында сақталды) ---
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 10%', backgroundColor: '#fff', borderBottom: '2px solid #b8860b' };
const logoWrapper = { display: 'flex', alignItems: 'center', gap: '0px', cursor: 'pointer' };
const logoMainText = { fontWeight: '800', fontSize: '1.8rem', color: '#1a1a1a' };
const logoSubText = { fontSize: '0.65rem', color: '#b8860b', fontWeight: '600' };
const logoTexts = { display: 'flex', flexDirection: 'column', lineHeight: '1' };
const subNavStyle = { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px 25px', padding: '15px 10%', backgroundColor: '#fff', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 10 };
const menuItemStyle = { cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' };
const loginBtnStyle = { padding: '10px 25px', background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '12px' };
const logoutBtnStyle = { padding: '6px 15px', border: '1px solid #1a1a1a', background: 'none', cursor: 'pointer', borderRadius: '12px' };
const mainLayout = { display: 'grid', gridTemplateColumns: '2.5fr 1fr', padding: '40px 10%', gap: '50px' };
const sectionTitle = { fontSize: '1.5rem', borderLeft: '4px solid #b8860b', paddingLeft: '15px', marginBottom: '20px' };
const articleCardStyle = { backgroundColor: '#fff', padding: '25px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderRadius: '8px' };
const regionTagStyle = { color: '#b8860b', fontSize: '0.7rem', fontWeight: 'bold' };
const articleTitle = { fontSize: '1.4rem', margin: '10px 0' };
const articleContent = { color: '#444', lineHeight: '1.6' };
const articleMeta = { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888', borderTop: '1px solid #eee', paddingTop: '10px' };
const formCardStyle = { backgroundColor: '#fff', padding: '30px', border: '1px solid #eee', borderRadius: '24px', position: 'sticky', top: '150px', display: 'flex', flexDirection: 'column' };
const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '12px', boxSizing: 'border-box' };
const btnStyle = { width: '100%', padding: '12px', background: '#b8860b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '12px' };
const btnStyleBlack = { width: '100%', padding: '12px', background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '12px' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '40px', width: '350px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px' };
const closeBtnStyle = { width: '100%', border: 'none', background: 'none', marginTop: '15px', color: '#999', cursor: 'pointer' };
const loginPromptStyle = { padding: '30px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '24px' };
const deleteBtnStyle = { background: 'none', border: '1px solid #ff4d4d', color: '#ff4d4d', fontSize: '0.65rem', padding: '3px 10px', cursor: 'pointer', borderRadius: '12px' };
const footerStyle = { backgroundColor: '#1a1a1a', color: '#fff', padding: '40px 10%', marginTop: '50px' };
const footerContentStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const infoPanelStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 10%', backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' };
const statsWrapperStyle = { display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.8rem', color: '#666', fontWeight: '600' };
const statItemStyle = { display: 'flex', alignItems: 'center', gap: '5px' };
const statDividerStyle = { color: '#ddd' };
const searchWrapperStyle = { display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #ddd', padding: '4px 12px', borderRadius: '20px', width: '250px' };
const searchInputStyle = { border: 'none', outline: 'none', fontSize: '0.85rem', width: '100%', marginLeft: '5px', borderRadius: '12px' };
const shareIconStyle = { textDecoration: 'none', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', border: '1px solid #eee', color: '#555', backgroundColor: '#f9f9f9' };
const labelStyle = { fontSize: '0.75rem', color: '#b8860b', fontWeight: 'bold', display: 'block', marginBottom: '5px', textAlign: 'left' };

export default App;
