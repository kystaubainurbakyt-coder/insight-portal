import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminPanel = ({ onBack }) => {
    const [pendingArticles, setPendingArticles] = useState([]);
    
    // Модальді терезе үшін state-тер
    const [showModal, setShowModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedArticle, setSelectedArticle] = useState(null);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        try {
            const res = await axios.get('https://insight-portal-5nmu.onrender.com/api/admin/pending-articles');
            setPendingArticles(res.data);
        } catch (err) {
            console.error("Мәлімет алу қатесі:", err);
        }
    };

    const handleApprove = async (id, userId) => {
        try {
            // Статусты 'approved' деп өзгерту және хабарлама жіберу
            await axios.put(`https://insight-portal-5nmu.onrender.com/api/admin/articles/${id}/status`, {
                status: 'approved',
                userId: userId // Backend-те хабарлама жіберу үшін керек
            });
            alert("Мақала мақұлданды және жарияланды!");
            fetchPending();
        } catch (err) {
            alert("Қате кетті");
        }
    };

    // Қабылдамау батырмасын басқанда модальді ашу
    const openRejectModal = (article) => {
        setSelectedArticle(article);
        setShowModal(true);
    };

    // Модаль ішіндегі "Жіберу" батырмасы
    const submitReject = async () => {
        if (!rejectionReason.trim()) {
            alert("Себебін жазыңыз!");
            return;
        }

        try {
            await axios.put(`https://insight-portal-5nmu.onrender.com/api/admin/articles/${selectedArticle.id}/status`, {
                status: 'rejected',
                reason: rejectionReason,
                userId: selectedArticle.user_id
            });
            
            alert("Мақала қабылданбады және себебі авторға жіберілді");
            setShowModal(false);
            setRejectionReason('');
            fetchPending();
        } catch (err) {
            console.error(err);
            alert("Жіберу кезінде қате кетті");
        }
    };

    return (
        <div style={adminContainerStyle}>
            <div style={adminHeaderStyle}>
                <h1>Админ Панель (Тексеру)</h1>
                <button onClick={onBack} style={backBtnStyle}>← БАСТЫ БЕТКЕ ҚАЙТУ</button>
            </div>
            <hr />
            
            <div style={listStyle}>
                {pendingArticles.length > 0 ? (
                    pendingArticles.map(article => (
                        <div key={article.id} style={adminCardStyle}>
                            <div style={{ flex: 1 }}>
                                <span style={{ color: '#b8860b', fontWeight: 'bold' }}>{article.region}</span>
                                <h3 style={{ margin: '10px 0' }}>{article.title}</h3>
                                <p style={{ color: '#666', fontSize: '0.9rem' }}>Авторы: {article.author_name}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button 
                                    onClick={() => handleApprove(article.id, article.user_id)} 
                                    style={approveBtnStyle}>
                                    МАҚҰЛДАУ
                                </button>
                                <button 
                                    onClick={() => openRejectModal(article)} 
                                    style={rejectBtnStyle}>
                                    ҚАБЫЛДАМАУ
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ textAlign: 'center', marginTop: '50px', color: '#999' }}>Тексерілетін жаңа мақалалар жоқ.</p>
                )}
            </div>

            {/* --- МОДАЛЬДІ ТЕРЕЗЕ --- */}
            {showModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginBottom: '15px' }}>Мақаланы қабылдамау себебі</h2>
                        <textarea
                            style={textAreaStyle}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Мысалы: Мақала мазмұны портал ережелеріне сай емес..."
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <button onClick={submitReject} style={confirmBtnStyle}>Жіберу</button>
                            <button onClick={() => setShowModal(false)} style={cancelBtnStyle}>Бас тарту</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ҚОСЫМША СТИЛЬДЕР
const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle = {
    backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '450px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
};
const textAreaStyle = {
    width: '100%', height: '120px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontFamily: 'inherit'
};
const confirmBtnStyle = { flex: 1, padding: '12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const cancelBtnStyle = { flex: 1, padding: '12px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

const adminContainerStyle = { padding: '40px 10%', backgroundColor: '#f9f9f9', minHeight: '100vh' };
const adminHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const backBtnStyle = { padding: '10px 20px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '5px' };
const listStyle = { marginTop: '20px' };
const adminCardStyle = { display: 'flex', justifyContent: 'space-between', padding: '20px', backgroundColor: '#fff', border: '1px solid #eee', marginBottom: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const approveBtnStyle = { padding: '10px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '5px' };
const rejectBtnStyle = { padding: '10px 15px', backgroundColor: '#dc3545', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '5px' };

export default AdminPanel;