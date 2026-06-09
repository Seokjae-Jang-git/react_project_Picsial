import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header'; 
import './css/Message.css';

function Message() {
    const location = useLocation();
    const [myUserNo, setMyUserNo] = useState(null);
    
    const [partnerList, setPartnerList] = useState([]);
    const [hiddenPartners, setHiddenPartners] = useState(() => {
        const saved = localStorage.getItem('hiddenChats');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [isSearching, setIsSearching] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    
    const [blockedList, setBlockedList] = useState([]);
    
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setMyUserNo(decoded.userNo);
            } catch (error) {
                console.error("토큰 에러:", error);
            }
        }
    }, []); 

    useEffect(() => {
        if (myUserNo && location.state?.targetPartner) {
            const partner = location.state.targetPartner;
            fetchMessages(partner);
            
            window.history.replaceState({}, document.title);
        }
    }, [myUserNo]); 

    const fetchPartnerList = async () => {
        if (!myUserNo) return;
        try {
            const response = await fetch(`http://localhost:3010/message/partners?userNo=${myUserNo}`);
            const data = await response.json();
            if (data.success) {
                setPartnerList(data.list);
            }
        } catch (error) {
            console.error("대화 상대 목록 로드 에러:", error);
        }
    };

    const fetchBlockedList = async () => {
        if (!myUserNo) return;
        try {
            const response = await fetch(`http://localhost:3010/message/block/list?userNo=${myUserNo}`);
            const data = await response.json();
            if (data.success) {
                setBlockedList(data.blockList);
            }
        } catch (error) {
            console.error("차단 목록 로드 에러:", error);
        }
    };

    useEffect(() => {
        fetchPartnerList();
    }, [myUserNo]);

    useEffect(() => {
        if (isSearching) {
            fetchBlockedList();
        }
    }, [isSearching]);

    useEffect(() => {
        localStorage.setItem('hiddenChats', JSON.stringify(hiddenPartners));
    }, [hiddenPartners]);

    const fetchMessages = async (partner) => {
        if (hiddenPartners.includes(partner.USER_NO)) {
            setHiddenPartners(prev => prev.filter(id => id !== partner.USER_NO));
        }

        setSelectedPartner(partner);
        try {
            const response = await fetch(`http://localhost:3010/message/history?userNo=${myUserNo}&partnerNo=${partner.USER_NO}`);
            const data = await response.json();
            if (data.success) {
                setMessages(data.messages);
                scrollToBottom();
            }

            if (partner.UNREAD_COUNT > 0) {
                await fetch('http://localhost:3010/message/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ myUserNo, partnerNo: partner.USER_NO })
                });
                setPartnerList(prev => prev.map(p => p.USER_NO === partner.USER_NO ? { ...p, UNREAD_COUNT: 0 } : p));
            }
        } catch (error) {
            console.error("메시지 로드 에러:", error);
        }
    };

    const handleSearch = async () => {
        if (!searchKeyword.trim()) return;
        try {
            const response = await fetch(`http://localhost:3010/message/search?nickname=${searchKeyword}`);
            const data = await response.json();
            if (data.success) {
                setSearchResults(data.users);
            }
        } catch (error) {
            console.error("사용자 검색 에러:", error);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !selectedPartner) return;
        
        const messageToSend = inputMessage;
        setInputMessage('');

        const tempMsg = {
            MESSAGE_ID: Date.now(),
            SENDER_NO: myUserNo,
            RECEIVER_NO: selectedPartner.USER_NO,
            CONTENT: messageToSend,
            CREATED_AT: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        try {
            const response = await fetch('http://localhost:3010/message/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderNo: myUserNo, receiverNo: selectedPartner.USER_NO, content: messageToSend })
            });
            const data = await response.json();
            if (data.success) {
                fetchPartnerList();
            }
        } catch (error) {
            console.error("메시지 전송 에러:", error);
        }
    };

    const handleBlockUser = async (partner) => {
        const isConfirmed = window.confirm(
            `${partner.NICKNAME}님을 정말 차단하시겠습니까?\n차단하면 상대방과의 대화 목록 및 내역이 모두 숨겨집니다.`
        );
        
        if (!isConfirmed || !myUserNo) return;

        try {
            const response = await fetch('http://localhost:3010/message/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blockerNo: myUserNo, blockedNo: partner.USER_NO })
            });
            const data = await response.json();

            if (data.success) {
                alert(`${partner.NICKNAME}님이 차단되었습니다.`);
                setSelectedPartner(null);
                fetchPartnerList();
                fetchBlockedList(); 
            } else {
                alert(data.message || "차단 처리 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error("차단 요청 에러:", error);
        }
    };

    const handleUnblockUser = async (blockedNo, nickname) => {
        const isConfirmed = window.confirm(`${nickname}님의 차단을 해제하시겠습니까?`);
        if (!isConfirmed || !myUserNo) return;

        try {
            const response = await fetch('http://localhost:3010/message/block/unblock', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blockerNo: myUserNo, blockedNo })
            });
            const data = await response.json();

            if (data.success) {
                alert(`${nickname}님의 차단이 해제되었습니다.`);
                fetchBlockedList(); 
                fetchPartnerList(); 
            } else {
                alert(data.message || "차단 해제 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error("차단 해제 요청 에러:", error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        return `${ampm} ${hours}:${minutes}`;
    };

    const hideChatRoom = (e, userNo) => {
        e.stopPropagation();
        setHiddenPartners(prev => [...prev, userNo]);
        if (selectedPartner && selectedPartner.USER_NO === userNo) {
            setSelectedPartner(null);
        }
    };

    const visiblePartners = partnerList.filter(p => !hiddenPartners.includes(p.USER_NO));
    const followingPartners = visiblePartners.filter(p => p.IS_FOLLOWING === 'Y');
    const otherPartners = visiblePartners.filter(p => p.IS_FOLLOWING === 'N');

    return (
        <div className="main-page-container">
            <Header />

            <main className="msg-body">
                <div className="msg-page-wrapper">
                    <div className="msg-container">
                        
                        <div className="msg-left-pane">
                            <div className="msg-left-header">
                                <h2>메세지</h2>
                            </div>
                            
                            <div className="msg-partner-list">
                                <div className="list-group-title">팔로잉</div>
                                {followingPartners.length > 0 ? followingPartners.map(partner => (
                                    <div key={partner.USER_NO} className={`msg-partner-item ${selectedPartner?.USER_NO === partner.USER_NO ? 'active' : ''}`} onClick={() => fetchMessages(partner)}>
                                        <div className="msg-partner-profile">
                                            {partner.PROFILE_IMAGE_URL ? <img src={partner.PROFILE_IMAGE_URL} alt="프로필" /> : <div className="default-avatar"></div>}
                                            <span className="partner-name">{partner.NICKNAME}</span>
                                            {partner.UNREAD_COUNT > 0 && <span className="unread-dot"></span>}
                                        </div>
                                        <div className="msg-partner-actions">
                                            <button className="btn-open-chat">열기</button>
                                            <button className="btn-close-chat" onClick={(e) => hideChatRoom(e, partner.USER_NO)}>닫기</button>
                                        </div>
                                    </div>
                                )) : <div className="empty-text">팔로잉 중인 대화가 없습니다.</div>}

                                <div className="list-group-title mt-20">기타 대화</div>
                                {otherPartners.length > 0 ? otherPartners.map(partner => (
                                    <div key={partner.USER_NO} className={`msg-partner-item ${selectedPartner?.USER_NO === partner.USER_NO ? 'active' : ''}`} onClick={() => fetchMessages(partner)}>
                                        <div className="msg-partner-profile">
                                            {partner.PROFILE_IMAGE_URL ? <img src={partner.PROFILE_IMAGE_URL} alt="프로필" /> : <div className="default-avatar"></div>}
                                            <span className="partner-name">{partner.NICKNAME}</span>
                                            {partner.UNREAD_COUNT > 0 && <span className="unread-dot"></span>}
                                        </div>
                                        <div className="msg-partner-actions">
                                            <button className="btn-open-chat">열기</button>
                                            <button className="btn-close-chat" onClick={(e) => hideChatRoom(e, partner.USER_NO)}>닫기</button>
                                        </div>
                                    </div>
                                )) : <div className="empty-text">진행 중인 다른 대화가 없습니다.</div>}
                            </div>

                            <div className="msg-search-area">
                                {isSearching ? (
                                    <div className="search-box">
                                        <div className="search-input-group">
                                            <input 
                                                type="text" 
                                                placeholder="닉네임 검색..." 
                                                value={searchKeyword}
                                                onChange={(e) => setSearchKeyword(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            />
                                            <button className="btn-search-action" onClick={handleSearch}>검색</button>
                                        </div>
                                        
                                        {searchResults.length > 0 && (
                                            <div className="search-results">
                                                {searchResults.map(user => (
                                                    <div key={user.USER_NO} className="search-result-item" onClick={() => fetchMessages(user)}>
                                                        {user.PROFILE_IMAGE_URL ? <img src={user.PROFILE_IMAGE_URL} alt="" /> : <div className="default-avatar-small"></div>}
                                                        <span>{user.NICKNAME}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="block-management-section">
                                            <div className="block-list-title">차단한 유저 관리 ({blockedList.length})</div>
                                            {blockedList.length > 0 ? (
                                                <div className="block-list-scroll">
                                                    {blockedList.map(bUser => (
                                                        <div key={bUser.USER_NO} className="block-list-item">
                                                            <div className="block-user-info">
                                                                {bUser.PROFILE_IMAGE_URL ? <img src={bUser.PROFILE_IMAGE_URL} alt="" /> : <div className="default-avatar-small"></div>}
                                                                <span>{bUser.NICKNAME}</span>
                                                            </div>
                                                            <button className="btn-unblock" onClick={() => handleUnblockUser(bUser.USER_NO, bUser.NICKNAME)}>해제</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="block-empty-text">차단한 사용자가 없습니다.</div>
                                            )}
                                        </div>

                                        <button className="btn-search-close" onClick={() => { 
                                            setIsSearching(false); 
                                            setSearchResults([]); 
                                            setSearchKeyword(''); 
                                        }}>창 닫기</button>
                                    </div>
                                ) : (
                                    <button className="btn-add-chat" onClick={() => setIsSearching(true)}>
                                        + 대화 추가 / 차단 해제
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="msg-right-pane">
                            {selectedPartner ? (
                                <>
                                    <div className="msg-chat-header">
                                        <div className="chat-partner-info">
                                            {selectedPartner.PROFILE_IMAGE_URL ? <img src={selectedPartner.PROFILE_IMAGE_URL} alt="프로필" className="chat-avatar" /> : <div className="chat-avatar-default"></div>}
                                            <h3>{selectedPartner.NICKNAME}</h3>
                                        </div>
                                        <div className="chat-header-actions">
                                            <button className="btn-block-user" onClick={() => handleBlockUser(selectedPartner)}>차단</button>
                                            <button className="btn-close-chat-right" onClick={(e) => hideChatRoom(e, selectedPartner.USER_NO)}>닫기</button>
                                        </div>
                                    </div>

                                    <div className="msg-chat-history">
                                        {messages.length === 0 ? (
                                            <div className="no-messages">대화를 시작해보세요!</div>
                                        ) : (
                                            messages.map(msg => (
                                                <div key={msg.MESSAGE_ID} className={`msg-bubble-wrapper ${msg.SENDER_NO === myUserNo ? 'sent' : 'received'}`}>
                                                    <div className="msg-bubble">{msg.CONTENT}</div>
                                                    <span className="msg-time">{formatTime(msg.CREATED_AT)}</span>
                                                </div>
                                            ))
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    <div className="msg-chat-input">
                                        <input 
                                            type="text" 
                                            placeholder="메시지 작성" 
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                        />
                                        <button className="btn-send-msg" onClick={handleSendMessage}>보내기</button>
                                    </div>
                                </>
                            ) : (
                                <div className="msg-empty-chat">
                                    대화할 상대를 선택해주세요.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Message;