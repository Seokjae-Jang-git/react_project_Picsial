const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db'); // DB 연결 모듈 경로에 맞게 수정해주세요.

// ==========================================
// [GET] /message/partners - 대화 상대 목록 (차단 유저 원천 제외 및 안 읽은 수 포함)
// ==========================================
router.get('/partners', async (req, res) => {
    let connection;
    try {
        const userNo = Number(req.query.userNo);
        if (!userNo) return res.status(400).json({ success: false, message: "유저 번호 누락" });

        connection = await db.getConnection();

        // 💡 핵심 튜닝: 내가 차단한 사람(BLOCKER_NO)과 나를 차단한 사람(BLOCKED_NO) 모두 목록에서 완전히 제외(NOT IN)합니다.
        const sql = `
            SELECT 
                U.USER_NO, U.NICKNAME, U.PROFILE_IMAGE_URL,
                CASE WHEN EXISTS (SELECT 1 FROM PS_FOLLOW F WHERE F.FOLLOWER_NO = :userNo AND F.FOLLOWING_NO = U.USER_NO) THEN 'Y' ELSE 'N' END AS IS_FOLLOWING,
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
        
        // 상대방(partnerNo)이 나(myUserNo)에게 보낸 메시지를 모두 읽음('Y') 처리
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

        // 💡 혹시나 주소창 유추 등으로 차단된 상대의 대화 내역을 보려고 할 때를 대비한 방어 쿼리
        const blockCheckSql = `
            SELECT COUNT(*) AS IS_BLOCKED FROM PS_BLOCK 
            WHERE (BLOCKER_NO = :userNo AND BLOCKED_NO = :partnerNo)
               OR (BLOCKER_NO = :partnerNo AND BLOCKED_NO = :userNo)
        `;
        const blockCheck = await connection.execute(blockCheckSql, { userNo, partnerNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (blockCheck.rows[0].IS_BLOCKED > 0) {
            // 차단 관계라면 빈 배열을 반환하여 대화 내용을 숨깁니다.
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
// [POST] /message/send - 메시지 전송
// ==========================================
router.post('/send', async (req, res) => {
    let connection;
    try {
        const { senderNo, receiverNo, content } = req.body;
        if (!senderNo || !receiverNo || !content) return res.status(400).json({ success: false });

        connection = await db.getConnection();

        // MESSAGE_ID는 시퀀스 사용, TITLE은 NULL 처리
        const sql = `
            INSERT INTO PS_MESSAGE (MESSAGE_ID, SENDER_NO, RECEIVER_NO, TITLE, CONTENT, IS_READ)
            VALUES (PS_MESSAGE_SEQ.NEXTVAL, :senderNo, :receiverNo, NULL, :content, 'N')
        `;
        
        await connection.execute(sql, { senderNo, receiverNo, content }, { autoCommit: true });
        res.json({ success: true });
    } catch (error) {
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
        
        // 💡 누락되었던 NAS URL 가공 로직 추가
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

        // 💡 이미 차단된 관계인지 선제적 확인
        const checkSql = `SELECT COUNT(*) AS CNT FROM PS_BLOCK WHERE BLOCKER_NO = :blockerNo AND BLOCKED_NO = :blockedNo`;
        const checkResult = await connection.execute(checkSql, { blockerNo, blockedNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (checkResult.rows[0].CNT > 0) {
            return res.status(400).json({ success: false, message: "이미 차단된 유저입니다." });
        }

        // 💡 차단 데이터 INSERT 수행 (시퀀스 및 SYSDATE + 9/24 기본값 작동)
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

        // 💡 내가 차단한 상대방의 정보(USER_NO, NICKNAME, PROFILE_IMAGE_URL)를 가져옵니다.
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

        // 💡 차단 테이블(PS_BLOCK)에서 해당 차단 쌍을 삭제(DELETE)합니다.
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

module.exports = router;