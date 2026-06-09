const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db'); 

// ==========================================
// [GET] /notification/list - 내 알림 목록 조회 (DB 기준 완벽 매칭 버전)
// ==========================================
router.get('/list', async (req, res) => {
    let connection;
    try {
        const userNo = Number(req.query.userNo);
        const filter = req.query.filter || 'all'; 
        const sort = req.query.sort || 'latest';  

        if (!userNo) return res.status(400).json({ success: false, message: "유저 번호 누락" });

        connection = await db.getConnection();

        let filterCondition = '';
        if (filter === 'like') filterCondition = "AND T.TYPE_CODE = 'LIKE'";
        else if (filter === 'comment') filterCondition = "AND T.TYPE_CODE = 'COMMENT'";
        else if (filter === 'follow') filterCondition = "AND T.TYPE_CODE = 'FOLLOW'";
        else if (filter === 'message') filterCondition = "AND T.TYPE_CODE = 'MESSAGE'";

        let orderByClause = sort === 'oldest' ? 'ORDER BY N.CREATED_AT ASC' : 'ORDER BY N.CREATED_AT DESC';

        const sql = `
            SELECT 
                N.NOTI_ID, N.RECEIVER_NO, N.SENDER_NO, N.IS_READ, N.CREATED_AT, N.PHOTO_ID, N.POST_ID,
                S.NICKNAME AS SENDER_NICKNAME,
                T.TYPE_CODE,
                P.TITLE AS PHOTO_TITLE,
                PO.TITLE AS POST_TITLE
            FROM PS_NOTIFICATION N
            JOIN PS_USER_INFO S ON N.SENDER_NO = S.USER_NO
            JOIN PS_NOTIFICATION_TYPE T ON N.TYPE_ID = T.TYPE_ID
            LEFT JOIN PS_PHOTO P ON N.PHOTO_ID = P.PHOTO_ID
            LEFT JOIN PS_POST PO ON N.POST_ID = PO.POST_ID
            WHERE N.RECEIVER_NO = :userNo
            ${filterCondition}
            ${orderByClause}
        `;

        const result = await connection.execute(sql, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const processedList = result.rows.map(noti => {
            let messageText = '';
            let targetTitle = noti.PHOTO_TITLE || noti.POST_TITLE || '게시물';

            if (noti.TYPE_CODE === 'LIKE') {
                messageText = `(좋아요) "${noti.SENDER_NICKNAME}님이 회원님의 사진/게시물 [${targetTitle}]을(를) 좋아합니다."`;
            } else if (noti.TYPE_CODE === 'COMMENT') {
                messageText = `(댓글) "${noti.SENDER_NICKNAME}님이 회원님의 사진/게시물 [${targetTitle}]에 댓글을 남겼습니다."`;
            } else if (noti.TYPE_CODE === 'FOLLOW') {
                messageText = `(팔로우) "${noti.SENDER_NICKNAME}님이 회원님을 팔로우하기 시작했습니다."`;
            } else if (noti.TYPE_CODE === 'MESSAGE') {
                messageText = `(메세지) "${noti.SENDER_NICKNAME}님이 새로운 메세지를 보냈습니다."`;
            } else if (noti.TYPE_CODE === 'SCRAP') { 
                messageText = `(스크랩) "${noti.SENDER_NICKNAME}님이 회원님의 사진/게시물 [${targetTitle}]을(를) 스크랩했습니다."`;
            } else {
                messageText = `"${noti.SENDER_NICKNAME}님으로부터 새로운 알림이 있습니다."`;
            }

            return {
                ...noti,
                MESSAGE_TEXT: messageText
            };
        });

        res.json({ success: true, list: processedList });

    } catch (error) {
        console.error("알림 목록 조회 에러:", error);
        res.status(500).json({ success: false, message: "알림 목록을 불러오지 못했습니다." });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [GET] /notification/recent - 대시보드용 최근 알림 5개 조회 (타입 조인 완벽 매칭 버전)
// ==========================================
router.get('/recent', async (req, res) => {
    let connection;
    try {
        const userNo = req.query.userNo;
        const limit = parseInt(req.query.limit) || 5;
        if (!userNo) return res.status(400).json({ success: false, message: "유저 번호 누락" });

        connection = await db.getConnection();

        const sql = `
            SELECT * FROM (
                SELECT 
                    N.NOTI_ID, 
                    N.CREATED_AT,
                    S.NICKNAME AS SENDER_NICKNAME,
                    T.TYPE_CODE, 
                    NVL(P.TITLE, PO.TITLE) AS TARGET_TITLE
                FROM PS_NOTIFICATION N
                JOIN PS_USER_INFO S ON N.SENDER_NO = S.USER_NO
                JOIN PS_NOTIFICATION_TYPE T ON N.TYPE_ID = T.TYPE_ID
                LEFT JOIN PS_PHOTO P ON N.PHOTO_ID = P.PHOTO_ID
                LEFT JOIN PS_POST PO ON N.POST_ID = PO.POST_ID
                WHERE N.RECEIVER_NO = :userNo 
                ORDER BY N.CREATED_AT DESC
            ) WHERE ROWNUM <= :limit
        `;

        const result = await connection.execute(sql, { userNo, limit }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        const list = result.rows.map(noti => {
            let messageText = '';
            let targetTitle = noti.TARGET_TITLE || '삭제된 게시물';

            if (noti.TYPE_CODE === 'LIKE') {
                messageText = `[좋아요] "${noti.SENDER_NICKNAME}님이 회원님의 사진/게시물 [${targetTitle}]을(를) 좋아합니다."`;
            } else if (noti.TYPE_CODE === 'COMMENT') {
                messageText = `[댓글] "${noti.SENDER_NICKNAME}님이 회원님의 사진/게시물 [${targetTitle}]에 댓글을 남겼습니다."`;
            } else if (noti.TYPE_CODE === 'FOLLOW') {
                messageText = `[팔로우] "${noti.SENDER_NICKNAME}님이 회원님을 팔로우하기 시작했습니다."`;
            } else if (noti.TYPE_CODE === 'MESSAGE') {
                messageText = `[메세지] "${noti.SENDER_NICKNAME}님이 새로운 메세지를 보냈습니다."`;
            } else if (noti.TYPE_CODE === 'SCRAP') { 
                messageText = `[스크랩] "${noti.SENDER_NICKNAME}님이 회원님의 사진/게시물 [${targetTitle}]을(를) 스크랩했습니다."`;
            } else {
                messageText = `"${noti.SENDER_NICKNAME}님으로부터 새로운 알림이 있습니다."`;
            }

            return {
                NOTI_ID: noti.NOTI_ID,
                MESSAGE: messageText, 
                CREATED_AT: noti.CREATED_AT
            };
        });

        res.json({ success: true, list });
    } catch (error) {
        console.error("최근 알림 조회 에러:", error.message);
        res.status(500).json({ success: false, message: "알림 로드 실패" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [POST] /notification/read-all - 알림 모두 읽음 처리
// ==========================================
router.post('/read-all', async (req, res) => {
    let connection;
    try {
        const { userNo } = req.body;
        if (!userNo) return res.status(400).json({ success: false });

        connection = await db.getConnection();
        
        const sql = `UPDATE PS_NOTIFICATION SET IS_READ = 'Y' WHERE RECEIVER_NO = :userNo AND IS_READ = 'N'`;
        
        await connection.execute(sql, { userNo }, { autoCommit: true });
        res.json({ success: true, message: "모두 읽음 처리 되었습니다." });

    } catch (error) {
        console.error("알림 모두 읽음 처리 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [PUT] /notification/:id/read - 단건 알림 읽음 처리
// ==========================================
router.put('/:id/read', async (req, res) => {
    let connection;
    try {
        const notiId = req.params.id;
        connection = await db.getConnection();
        
        await connection.execute(
            `UPDATE PS_NOTIFICATION SET IS_READ = 'Y' WHERE NOTI_ID = :notiId`,
            { notiId },
            { autoCommit: true }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error("알림 읽음 처리 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) {}
        }
    }
});

// ==========================================
// [GET] /notification/unread-count - 안 읽은 알림 개수 조회
// ==========================================
router.get('/unread-count', async (req, res) => {
    let connection;
    try {
        const userNo = req.query.userNo; 
        if (!userNo) {
            return res.json({ success: false, count: 0 });
        }

        connection = await db.getConnection();
        
        const sql = `
            SELECT COUNT(*) AS UNREAD_COUNT 
            FROM PS_NOTIFICATION 
            WHERE RECEIVER_NO = :userNo AND IS_READ = 'N'
        `;
        const result = await connection.execute(sql, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        res.json({ success: true, count: result.rows[0].UNREAD_COUNT });

    } catch (error) {
        console.error("안 읽은 알림 개수 조회 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) {}
        }
    }
});

module.exports = router;