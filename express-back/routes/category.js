const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db'); 

// ==========================================
// [GET] /PHOTO 카테고리 전체 목록 조회 (가나다순, '기타'는 맨 아래 고정)
// ==========================================
router.get('/photo', async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();

        const sql = `
            SELECT CATEGORY_ID, CATEGORY_NAME 
            FROM PS_CATEGORY_PHOTO 
            ORDER BY 
                CASE WHEN CATEGORY_NAME = '기타' THEN 2 ELSE 1 END,
                CATEGORY_NAME ASC
        `;
        
        const result = await connection.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json({ success: true, categories: result.rows });

    } catch (error) {
        console.error("카테고리 조회 API 에러:", error);
        res.status(500).json({ success: false, message: "카테고리 목록을 불러오지 못했습니다." });
    } finally {
        if (connection) {
            try { 
                await connection.close(); 
            } catch (e) { 
                console.error(e); 
            }
        }
    }
});

// ==========================================
// [GET] /post - 게시물 카테고리 목록 조회 (가나다순, '기타'는 맨 아래 고정)
// ==========================================
router.get('/post', async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();

        const sql = `
            SELECT CATEGORY_ID, CATEGORY_NAME 
            FROM PS_CATEGORY_POST 
            ORDER BY 
                CASE WHEN CATEGORY_NAME = '기타' THEN 2 ELSE 1 END,
                CATEGORY_NAME ASC
        `;
        
        const result = await connection.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json({ success: true, categories: result.rows });

    } catch (error) {
        console.error("게시물 카테고리 조회 API 에러:", error);
        res.status(500).json({ success: false, message: "게시물 카테고리 목록을 불러오지 못했습니다." });
    } finally {
        if (connection) {
            try { 
                await connection.close(); 
            } catch (e) { 
                console.error(e); 
            }
        }
    }
});

module.exports = router;