// routes/photo.js
const express = require('express');
const router = express.Router();
const SftpClient = require('ssh2-sftp-client');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const db = require('../db');
const oracledb = require('oracledb');

const upload = multer({ storage: multer.memoryStorage() });

// [함수] SFTP NAS 파일 전송 
async function uploadToNAS(fileBuffer, thumbBuffer, originalFileName, thumbFileName) {
    const sftp = new SftpClient();
    const originalRemotePath = `/picsial_images/${originalFileName}`;
    const thumbRemotePath = `/picsial_images/${thumbFileName}`;
    
    try {
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: Number(process.env.SFTP_PORT),
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS
        });
        
        await Promise.all([
            sftp.put(fileBuffer, originalRemotePath),
            sftp.put(thumbBuffer, thumbRemotePath)
        ]);
        
        return { originalFileName, thumbFileName }; 
    } catch (err) {
        console.error('SFTP 업로드 실패:', err);
        throw err;
    } finally {
        await sftp.end();
    }
}

const exifr = require('exifr'); // 💡 1. 상단에 추가

// ==========================================
// [POST] /photo/upload - 사진 등록 API (메타데이터 자동 추출 추가)
// ==========================================
router.post('/upload', upload.single('image'), async (req, res) => {
    let connection;
    try {
        if (!req.file) return res.status(400).json({ success: false, message: '파일이 없습니다.' });

        // 💡 2. EXIF 메타데이터 추출 (파일 버퍼에서 즉시 추출)
        let meta = {};
        try {
            meta = await exifr.parse(req.file.buffer); 
        } catch (exifErr) {
            console.warn("메타데이터 추출 실패 (파일이 사진이 아니거나 정보 없음):", exifErr);
        }

        const ext = path.extname(req.file.originalname);
        const baseName = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
        const originalFileName = `${baseName}${ext}`;
        const thumbFileName = `thumb_${baseName}.webp`;

        const thumbBuffer = await sharp(req.file.buffer)
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        const savedFiles = await uploadToNAS(req.file.buffer, thumbBuffer, originalFileName, thumbFileName);
        const { title, description, categoryId, userNo, location } = req.body; // location은 사용자가 직접 입력한 값

        connection = await db.getConnection();
        
        // 💡 3. SQL 수정 (메타데이터 컬럼 추가)
        const insertPhotoSql = `
            INSERT INTO PS_PHOTO (
                PHOTO_ID, USER_NO, TITLE, DESCRIPTION, IMAGE_URL, THUMB_URL,
                CAMERA_MODEL, LENS, FOCAL_LENGTH, APERTURE, SHUTTER_SPEED, ISO, SHOOT_DATE, LOCATION
            ) VALUES (
                PS_PHOTO_SEQ.NEXTVAL, :userNo, :title, :description, :imageName, :thumbName,
                :model, :lens, :focal, :aperture, :shutter, :iso, :shootDate, :location
            )
            RETURNING PHOTO_ID INTO :newPhotoId
        `;
        
        const photoResult = await connection.execute(insertPhotoSql, {
            userNo: userNo || 1, 
            title: title || '제목 없음',
            description: description || '',
            imageName: savedFiles.originalFileName, 
            thumbName: savedFiles.thumbFileName, 
            // 메타데이터 매핑 (값이 없으면 null)
            model: meta ? meta.Model : null,
            lens: meta ? meta.LensModel : null,
            focal: meta && meta.FocalLength ? String(meta.FocalLength) : null,
            aperture: meta && meta.FNumber ? String(meta.FNumber) : null,
            shutter: meta && meta.ExposureTime ? String(meta.ExposureTime) : null,
            iso: meta ? String(meta.ISO) : null,
            shootDate: meta && meta.DateTimeOriginal ? meta.DateTimeOriginal : null,
            location: location || null, // 사용자가 입력한 장소
            newPhotoId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });

        const generatedPhotoId = photoResult.outBinds.newPhotoId[0];

        if (categoryId) {
            const insertCategorySql = `
                INSERT INTO PS_PHOTO_CATEGORY (PHOTO_ID, CATEGORY_ID)
                VALUES (:photoId, :categoryId)
            `;
            await connection.execute(insertCategorySql, {
                photoId: generatedPhotoId,
                categoryId: Number(categoryId)
            });
        }

        await connection.commit();
        res.status(200).json({ success: true, message: '업로드 완료' });

    } catch (error) {
        console.error("업로드 에러:", error);
        res.status(500).send('서버 오류');
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [GET] /photo - 사진 전체 목록 조회 (필터 & 정렬 완벽 적용)
// ==========================================
router.get('/', async (req, res) => {
    let connection;
    try {
        const { category, sort } = req.query;
        connection = await db.getConnection();

        const bindParams = {};

        // 💡 1. 기본 SELECT 구문 (JOIN 및 개수 집계 서브쿼리 포함)
        // 질문자님이 설계하신 대로 P, PC, C 테이블을 조인합니다.
        let sql = `
            SELECT 
                P.PHOTO_ID, P.USER_NO, P.TITLE, P.IMAGE_URL, P.THUMB_URL, P.VIEW_COUNT, P.LIKE_COUNT,
                C.CATEGORY_ID, C.CATEGORY_NAME,
                NVL(S.SCRAP_COUNT, 0) AS SCRAP_COUNT,
                NVL(CM.COMMENT_COUNT, 0) AS COMMENT_COUNT
            FROM PS_PHOTO P
            LEFT JOIN PS_PHOTO_CATEGORY PC ON P.PHOTO_ID = PC.PHOTO_ID
            LEFT JOIN PS_CATEGORY C ON PC.CATEGORY_ID = C.CATEGORY_ID
            -- 💡 미리 그룹핑해서 개수를 세어두고 한 번만 조인합니다 (속도 대폭 향상)
            LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE GROUP BY PHOTO_ID) S ON P.PHOTO_ID = S.PHOTO_ID
            LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS COMMENT_COUNT FROM PS_COMMENT_TABLE GROUP BY PHOTO_ID) CM ON P.PHOTO_ID = CM.PHOTO_ID
            WHERE 1=1
        `;

        // 💡 2. 카테고리 필터링 적용 (카테고리 번호가 넘어온 경우)
        if (category && category.trim() !== '' && category !== 'undefined') {
            const parsedCategory = Number(category);
            if (!isNaN(parsedCategory)) { 
                sql += ` AND PC.CATEGORY_ID = :category`;
                bindParams.category = parsedCategory;
            }
        }

        // 💡 3. 동적 정렬 (Sort) 적용
        // 집계된 별칭(Alias)인 SCRAP_COUNT와 COMMENT_COUNT를 기준으로 정렬합니다.
        if (sort === 'scraps') {
            sql += ` ORDER BY SCRAP_COUNT DESC, P.PHOTO_ID DESC`;
        } else if (sort === 'comments') {
            sql += ` ORDER BY COMMENT_COUNT DESC, P.PHOTO_ID DESC`;
        } else if (sort === 'likes') {
            sql += ` ORDER BY P.LIKE_COUNT DESC, P.PHOTO_ID DESC`;
        } else if (sort === 'views') {
            sql += ` ORDER BY P.VIEW_COUNT DESC, P.PHOTO_ID DESC`;
        } else if (sort === 'oldest') {
            sql += ` ORDER BY P.PHOTO_ID ASC`;
        } else {
            // 기본값: 최신순
            sql += ` ORDER BY P.PHOTO_ID DESC`;
        }

        const result = await connection.execute(sql, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // NAS URL 방어 코드 (기존과 동일)
        const processedPhotos = result.rows.map(photo => ({
            ...photo,
            IMAGE_URL: photo.IMAGE_URL && photo.IMAGE_URL.startsWith('http') 
                ? photo.IMAGE_URL 
                : `${process.env.NAS_BASE_URL}/${photo.IMAGE_URL}`,
            THUMB_URL: photo.THUMB_URL && photo.THUMB_URL.startsWith('http')
                ? photo.THUMB_URL 
                : `${process.env.NAS_BASE_URL}/${photo.THUMB_URL}`
        }));

        res.json({ success: true, photos: processedPhotos });
    } catch (error) {
        console.error("목록 조회 및 정렬 에러:", error);
        res.status(500).json({ success: false, message: "불러오기 실패" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [GET] /photo/:id - 사진 상세 및 댓글 목록 조회
// ==========================================
router.get('/:id', async (req, res) => {
    let connection;
    const photoId = req.params.id;
    try {
        connection = await db.getConnection();

        // 💡 0. 조회수 증가 (가장 먼저 실행)
        const updateViewSql = `UPDATE PS_PHOTO SET VIEW_COUNT = VIEW_COUNT + 1 WHERE PHOTO_ID = :id`;
        await connection.execute(updateViewSql, { id: photoId });
        await connection.commit(); // 변경 사항 즉시 저장

        // 1. 사진 상세 정보 조회
        const photoSql = `
            SELECT P.*, C.CATEGORY_NAME, NVL(S.SCRAP_COUNT, 0) AS SCRAP_COUNT
            FROM PS_PHOTO P
            LEFT JOIN PS_PHOTO_CATEGORY PC ON P.PHOTO_ID = PC.PHOTO_ID
            LEFT JOIN PS_CATEGORY C ON PC.CATEGORY_ID = C.CATEGORY_ID
            LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE GROUP BY PHOTO_ID) S ON P.PHOTO_ID = S.PHOTO_ID
            WHERE P.PHOTO_ID = :id
        `;
        const photoResult = await connection.execute(photoSql, { id: photoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (photoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "사진을 찾을 수 없습니다." });
        }

        // 💡 [수정] 아래 4줄을 추가하여 URL을 가공합니다.
        const photoData = photoResult.rows[0];
        photoData.IMAGE_URL = photoData.IMAGE_URL && photoData.IMAGE_URL.startsWith('http') ? photoData.IMAGE_URL : `${process.env.NAS_BASE_URL}/${photoData.IMAGE_URL}`;
        photoData.THUMB_URL = photoData.THUMB_URL && photoData.THUMB_URL.startsWith('http') ? photoData.THUMB_URL : `${process.env.NAS_BASE_URL}/${photoData.THUMB_URL}`;

        // 2. 해당 사진의 댓글 목록 조회
        const commentSql = `
            SELECT COMMENT_ID, USER_NO, CONTENT, TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI') AS CREATED_AT
            FROM PS_COMMENT_TABLE
            WHERE PHOTO_ID = :id
            ORDER BY COMMENT_ID DESC
        `;
        const commentResult = await connection.execute(commentSql, { id: photoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 3. 응답 전송
        res.json({ 
            success: true, 
            photo: photoData, 
            comments: commentResult.rows 
        });

    } catch (error) {
        console.error("상세 조회 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [POST] /photo/:id/like - 좋아요 토글 처리
// ==========================================
router.post('/:id/like', async (req, res) => {
    let connection;
    const photoId = req.params.id;
    const { isLiked } = req.body; // 프론트에서 true(하트 채움) 또는 false(하트 비움)를 보냄

    try {
        connection = await db.getConnection();
        
        // isLiked가 true면 1 증가, false면 1 감소
        const operator = isLiked ? '+' : '-';
        
        // LIKE_COUNT가 0 미만으로 떨어지지 않도록 방어하는 조건 추가
        const updateSql = `
            UPDATE PS_PHOTO 
            SET LIKE_COUNT = CASE 
                WHEN LIKE_COUNT ${operator} 1 < 0 THEN 0 
                ELSE LIKE_COUNT ${operator} 1 
            END
            WHERE PHOTO_ID = :id
        `;
        
        await connection.execute(updateSql, { id: photoId });
        await connection.commit();

        res.json({ success: true, message: "좋아요 업데이트 완료" });
    } catch (error) {
        console.error("좋아요 업데이트 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [POST] /photo/:id/scrap - 스크랩 토글 처리
// ==========================================
router.post('/:id/scrap', async (req, res) => {
    let connection;
    const photoId = req.params.id;
    // 프론트에서 isScrapped(채울지 말지)와 유저번호를 받습니다.
    const { isScrapped, userNo } = req.body; 

    try {
        connection = await db.getConnection();
        
        if (isScrapped) {
            // 💡 스크랩 설정: PS_SCRAP_TABLE에 새로운 레코드 INSERT
            const insertSql = `
                INSERT INTO PS_SCRAP_TABLE (SCRAP_ID, USER_NO, PHOTO_ID)
                VALUES (PS_SCRAP_TABLE_SEQ.NEXTVAL, :userNo, :photoId)
            `;
            await connection.execute(insertSql, { userNo: userNo || 1, photoId: photoId });
        } else {
            // 💡 스크랩 취소: PS_SCRAP_TABLE에서 해당 레코드 DELETE
            const deleteSql = `
                DELETE FROM PS_SCRAP_TABLE 
                WHERE USER_NO = :userNo AND PHOTO_ID = :photoId
            `;
            await connection.execute(deleteSql, { userNo: userNo || 1, photoId: photoId });
        }

        await connection.commit();
        res.json({ success: true, message: "스크랩 업데이트 완료" });
    } catch (error) {
        console.error("스크랩 업데이트 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [POST] /photo/:id/comment - 댓글 등록 API (신규 추가)
// ==========================================
router.post('/:id/comment', async (req, res) => {
    let connection;
    const photoId = req.params.id;
    const { content, userNo } = req.body; // 프론트에서 보낸 댓글 내용과 유저 번호

    if (!content || content.trim() === '') {
        return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
    }

    try {
        connection = await db.getConnection();

        // 💡 질문자님이 설계하신 시퀀스를 사용하여 댓글 INSERT
        const insertSql = `
            INSERT INTO PS_COMMENT_TABLE (COMMENT_ID, USER_NO, PHOTO_ID, CONTENT)
            VALUES (PS_COMMENT_TABLE_SEQ.NEXTVAL, :userNo, :photoId, :content)
        `;
        
        await connection.execute(insertSql, {
            userNo: userNo || 1, // 로그인 연동 전까지는 1번 유저로 테스트
            photoId: photoId,
            content: content
        });

        await connection.commit();
        res.json({ success: true, message: "댓글이 성공적으로 등록되었습니다." });

    } catch (error) {
        console.error("댓글 등록 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

module.exports = router;