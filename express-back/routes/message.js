const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db'); 

// ==========================================
// [GET] /message/partners - 대화 상대 목록 (차단 유저 원천 제외 및 안 읽은 수 포함)
// ==========================================
router.get('/partners', async (req, res) => {
    let connection;
    try {
        const userNo = Number(req.query.userNo);
        if (!userNo) return res.status(400).json({ success: false, message: "유저 번호 누락" });

        connection = await db.getConnection();

        const sql = `
            SELECT 
                U.USER_NO, U.NICKNAME, U.PROFILE_IMAGE_URL,
                CASE WHEN EXISTS (SELECT 1 FROM PS_FOLLOW F WHERE F.FOLLOWER_NO = :userNo AND F.FOLLOWING_NO = U.USER_NO) THEN 'Y' ELSE 'N' END AS IS_FOLLOWING,
                -- 💡 여기에 AND 를 추가하여 문법 오류를 해결했습니다!
                (SELECT COUNT(*) FROM PS_MESSAGE M WHERE M.SENDER_NO = U.USER_NO AND M.RECEIVER_NO = :userNo AND M.IS_READ = 'N') AS UNREAD_COUNT
            FROM PS_USER_INFO U
            WHERE U.USER_NO IN (
                SELECT FOLLOWING_NO FROM PS_FOLLOW WHERE FOLLOWER_NO = :userNo
                UNION
                SELECT SENDER_NO FROM PS_MESSAGE WHERE RECEIVER_NO = :userNo
                UNION
                SELECT RECEIVER_NO FROM PS_MESSAGE WHERE SENDER_NO = :userNo
            )
            AND U.USER_NO != :userNo
            AND U.USER_NO NOT IN (SELECT BLOCKED_NO FROM PS_BLOCK WHERE BLOCKER_NO = :userNo)
            AND U.USER_NO NOT IN (SELECT BLOCKER_NO FROM PS_BLOCK WHERE BLOCKED_NO = :userNo)
        `;
        
        const result = await connection.execute(sql, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        const processedList = result.rows.map(user => {
            let finalUrl = user.PROFILE_IMAGE_URL;
            if (finalUrl && !finalUrl.startsWith('http')) {
                finalUrl = `${process.env.NAS_BASE_URL_PROFILE || ''}/${finalUrl}`;
            }
            return { ...user, PROFILE_IMAGE_URL: finalUrl };
        });

        res.json({ success: true, list: processedList });
    } catch (error) {
        console.error("대화 상대 로드 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [POST] /message/read - 메시지 읽음 처리 (채팅방 열었을 때 호출)
// ==========================================
router.post('/read', async (req, res) => {
    let connection;
    try {
        const { myUserNo, partnerNo } = req.body;
        connection = await db.getConnection();
        
        const sql = `UPDATE PS_MESSAGE SET IS_READ = 'Y' WHERE SENDER_NO = :partnerNo AND RECEIVER_NO = :myUserNo AND IS_READ = 'N'`;
        await connection.execute(sql, { partnerNo, myUserNo }, { autoCommit: true });
        
        res.json({ success: true });
    } catch (error) {
        console.error("메시지 읽음 처리 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [GET] /message/history - 특정 상대와의 대화 내역 불러오기 (차단 방어막 추가)
// ==========================================
router.get('/history', async (req, res) => {
    let connection;
    try {
        const { userNo, partnerNo } = req.query;
        if (!userNo || !partnerNo) return res.status(400).json({ success: false });

        connection = await db.getConnection();

        const blockCheckSql = `
            SELECT COUNT(*) AS IS_BLOCKED FROM PS_BLOCK 
            WHERE (BLOCKER_NO = :userNo AND BLOCKED_NO = :partnerNo)
               OR (BLOCKER_NO = :partnerNo AND BLOCKED_NO = :userNo)
        `;
        const blockCheck = await connection.execute(blockCheckSql, { userNo, partnerNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (blockCheck.rows[0].IS_BLOCKED > 0) {
            return res.json({ success: true, messages: [], isBlockedRelationship: true });
        }

        const sql = `
            SELECT MESSAGE_ID, SENDER_NO, RECEIVER_NO, CONTENT, IS_READ, CREATED_AT
            FROM PS_MESSAGE
            WHERE (SENDER_NO = :userNo AND RECEIVER_NO = :partnerNo)
               OR (SENDER_NO = :partnerNo AND RECEIVER_NO = :userNo)
            ORDER BY CREATED_AT ASC
        `;
        
        const result = await connection.execute(sql, { userNo, partnerNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json({ success: true, messages: result.rows, isBlockedRelationship: false });
    } catch (error) {
        console.error("메시지 내역 로드 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [POST] /message/send - 메시지 전송 (최종 완성본)
// ==========================================
router.post('/send', async (req, res) => {
    let connection;
    try {
        const { senderNo, receiverNo, content } = req.body;
        if (!senderNo || !receiverNo || !content) return res.status(400).json({ success: false });

        connection = await db.getConnection();

        const sql = `
            INSERT INTO PS_MESSAGE (MESSAGE_ID, SENDER_NO, RECEIVER_NO, TITLE, CONTENT, IS_READ)
            VALUES (PS_MESSAGE_SEQ.NEXTVAL, :senderNo, :receiverNo, NULL, :content, 'N')
        `;
        await connection.execute(sql, { senderNo, receiverNo, content }, { autoCommit: false });

        if (senderNo !== receiverNo) {
            const notiSql = `
                INSERT INTO PS_NOTIFICATION (
                    NOTI_ID, RECEIVER_NO, SENDER_NO, TYPE_ID, PHOTO_ID, POST_ID, IS_READ
                ) VALUES (
                    PS_NOTIFICATION_SEQ.NEXTVAL, :receiverNo, :senderNo, 4, NULL, NULL, 'N'
                )
            `;
            await connection.execute(notiSql, { receiverNo, senderNo }, { autoCommit: false });
        }
        
        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error("롤백 실패:", e); }
        }
        console.error("메시지 전송 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [GET] /message/search - 닉네임으로 새로운 대화 상대 검색 (URL 가공 추가)
// ==========================================
router.get('/search', async (req, res) => {
    let connection;
    try {
        const nickname = req.query.nickname;
        if (!nickname) return res.json({ success: true, users: [] });

        connection = await db.getConnection();
        const sql = `
            SELECT USER_NO, NICKNAME, PROFILE_IMAGE_URL 
            FROM PS_USER_INFO 
            WHERE NICKNAME LIKE '%' || :nickname || '%'
        `;
        const result = await connection.execute(sql, { nickname }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        const processedUsers = result.rows.map(user => {
            let finalUrl = user.PROFILE_IMAGE_URL;
            if (finalUrl && !finalUrl.startsWith('http')) {
                finalUrl = `${process.env.NAS_BASE_URL_PROFILE || ''}/${finalUrl}`;
            }
            return { ...user, PROFILE_IMAGE_URL: finalUrl };
        });

        res.json({ success: true, users: processedUsers });
    } catch (error) {
        console.error("사용자 검색 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [POST] /message/block - 유저 차단 등록 기능 (신규 추가)
// ==========================================
router.post('/block', async (req, res) => {
    let connection;
    try {
        const { blockerNo, blockedNo } = req.body;
        if (!blockerNo || !blockedNo) {
            return res.status(400).json({ success: false, message: "필수 데이터 누락" });
        }

        connection = await db.getConnection();

        const checkSql = `SELECT COUNT(*) AS CNT FROM PS_BLOCK WHERE BLOCKER_NO = :blockerNo AND BLOCKED_NO = :blockedNo`;
        const checkResult = await connection.execute(checkSql, { blockerNo, blockedNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (checkResult.rows[0].CNT > 0) {
            return res.status(400).json({ success: false, message: "이미 차단된 유저입니다." });
        }

        const insertSql = `
            INSERT INTO PS_BLOCK (BLOCK_ID, BLOCKER_NO, BLOCKED_NO)
            VALUES (PS_BLOCK_SEQ.NEXTVAL, :blockerNo, :blockedNo)
        `;
        await connection.execute(insertSql, { blockerNo, blockedNo }, { autoCommit: true });

        res.json({ success: true, message: "성공적으로 차단되었습니다." });
    } catch (error) {
        console.error("유저 차단 에러:", error.message);
        res.status(500).json({ success: false, message: "차단 처리 중 에러 발생" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [GET] /message/block/list - 내가 차단한 유저 목록 조회 (신규 추가)
// ==========================================
router.get('/block/list', async (req, res) => {
    let connection;
    try {
        const userNo = Number(req.query.userNo);
        if (!userNo) return res.status(400).json({ success: false, message: "유저 번호 누락" });

        connection = await db.getConnection();

        const sql = `
            SELECT B.BLOCK_ID, U.USER_NO, U.NICKNAME, U.PROFILE_IMAGE_URL
            FROM PS_BLOCK B
            JOIN PS_USER_INFO U ON B.BLOCKED_NO = U.USER_NO
            WHERE B.BLOCKER_NO = :userNo
            ORDER BY B.CREATED_AT DESC
        `;
        
        const result = await connection.execute(sql, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        const processedList = result.rows.map(user => {
            let finalUrl = user.PROFILE_IMAGE_URL;
            if (finalUrl && !finalUrl.startsWith('http')) {
                finalUrl = `${process.env.NAS_BASE_URL_PROFILE || ''}/${finalUrl}`;
            }
            return { ...user, PROFILE_IMAGE_URL: finalUrl };
        });

        res.json({ success: true, blockList: processedList });
    } catch (error) {
        console.error("차단 목록 조회 에학:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [DELETE] /message/block/unblock - 유저 차단 해제 기능 (신규 추가)
// ==========================================
router.delete('/block/unblock', async (req, res) => {
    let connection;
    try {
        const { blockerNo, blockedNo } = req.body;
        if (!blockerNo || !blockedNo) {
            return res.status(400).json({ success: false, message: "필수 데이터 누락" });
        }

        connection = await db.getConnection();

        const sql = `
            DELETE FROM PS_BLOCK 
            WHERE BLOCKER_NO = :blockerNo AND BLOCKED_NO = :blockedNo
        `;
        
        const result = await connection.execute(sql, { blockerNo, blockedNo }, { autoCommit: true });

        if (result.rowsAffected > 0) {
            res.json({ success: true, message: "차단이 해제되었습니다." });
        } else {
            res.json({ success: false, message: "차단되어 있지 않은 유저입니다." });
        }
    } catch (error) {
        console.error("차단 해제 에러:", error.message);
        res.status(500).json({ success: false, message: "차단 해제 처리 중 에러 발생" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [GET] /message/recent - 대시보드용 최근 대화 상대 3명 조회
// ==========================================
router.get('/recent', async (req, res) => {
    let connection;
    try {
        const userNo = req.query.userNo;
        const limit = parseInt(req.query.limit) || 3;
        if (!userNo) return res.status(400).json({ success: false, message: "유저 번호 누락" });

        connection = await db.getConnection();

        const sql = `
            SELECT * FROM (
                SELECT 
                    M.PARTNER_NO,
                    U.NICKNAME,
                    U.PROFILE_IMAGE_URL,
                    (SELECT COUNT(*) FROM PS_MESSAGE WHERE SENDER_NO = M.PARTNER_NO AND RECEIVER_NO = :userNo AND IS_READ = 'N') AS UNREAD_COUNT
                FROM (
                    SELECT 
                        CASE WHEN SENDER_NO = :userNo THEN RECEIVER_NO ELSE SENDER_NO END AS PARTNER_NO,
                        MAX(CREATED_AT) AS MAX_TIME
                    FROM PS_MESSAGE
                    WHERE SENDER_NO = :userNo OR RECEIVER_NO = :userNo
                    GROUP BY CASE WHEN SENDER_NO = :userNo THEN RECEIVER_NO ELSE SENDER_NO END
                    ORDER BY MAX_TIME DESC
                ) M
                JOIN PS_USER_INFO U ON M.PARTNER_NO = U.USER_NO
            ) WHERE ROWNUM <= :limit
        `;

        const result = await connection.execute(sql, { userNo, limit }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const list = result.rows.map(partner => ({
            ...partner,
            PROFILE_IMAGE_URL: partner.PROFILE_IMAGE_URL && partner.PROFILE_IMAGE_URL.startsWith('http')
                ? partner.PROFILE_IMAGE_URL
                : partner.PROFILE_IMAGE_URL ? `${process.env.NAS_BASE_URL_PROFILE}/${partner.PROFILE_IMAGE_URL}` : null
        }));

        res.json({ success: true, list });
    } catch (error) {
        console.error("최근 메시지 조회 에러:", error.message);
        res.status(500).json({ success: false, message: "메시지 로드 실패" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

module.exports = router;