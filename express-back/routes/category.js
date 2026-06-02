const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db'); // 기존 db.js 경로 확인

// ==========================================
// [GET] /api/categories - 카테고리 전체 목록 조회
// ==========================================
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();

        const sql = `SELECT * FROM PS_CATEGORY ORDER BY CATEGORY_ID ASC`;
        const result = await connection.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json({ success: true, categories: result.rows });

    } catch (error) {
        console.error("카테고리 조회 API 에러:", error);
        res.status(500).json({ success: false, message: "카테고리 목록을 불러오지 못했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

module.exports = router;