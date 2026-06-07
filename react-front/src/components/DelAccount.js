import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import './css/DelAccount.css';

const DelAccount = () => {
    const navigate = useNavigate();
    const { myUserNo } = useOutletContext();
    const [reason, setReason] = useState('');

    const handleDelete = async () => {
        if (!reason.trim()) {
            alert('탈퇴 사유를 입력해주세요.');
            return;
        }

        if (!window.confirm('정말 계정을 삭제하시겠습니까? 복구할 수 없습니다.')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3010/auth/delete-account`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                // 💡 JWT 토큰을 사용하는 경우 헤더에 Authorization을 추가하셔도 좋습니다.
                // 여기서는 직관적으로 userNo와 reason을 바디로 보냅니다.
                body: JSON.stringify({ userNo: myUserNo, reason }) 
            });

            const data = await response.json();
            if (data.success) {
                alert('계정이 성공적으로 삭제되었습니다.');
                // 💡 로컬 스토리지나 쿠키에 저장된 JWT 토큰/유저 정보 삭제 (예시)
                localStorage.removeItem('token'); 
                navigate('/login');
            } else {
                alert(data.message || '삭제 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('계정 삭제 에러:', error);
            alert('서버 오류로 삭제에 실패했습니다.');
        }
    };

    return (
        <div className="da-wrapper">
            <div className="da-container">
                <h2 className="da-title">계정 삭제</h2>
                <p className="da-desc">삭제 사유를 작성해주세요.</p>
                
                <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="탈퇴 사유를 입력해주세요."
                    className="da-textarea"
                />

                <p className="da-warning">
                    삭제 후 모든 데이터가 삭제되며,<br />
                    복구 불가능해집니다. 삭제를 하시겠습니까?
                </p>

                <div className="da-actions">
                    <button className="da-btn-cancel" onClick={() => navigate(-1)}>취소</button>
                    <button className="da-btn-confirm" onClick={handleDelete}>확인</button>
                </div>
            </div>
        </div>
    );
};

export default DelAccount;