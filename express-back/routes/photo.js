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
    const originalRemotePath = `${process.env.NAS_ROOT_PATH}/${originalFileName}`;
    const thumbRemotePath = `${process.env.NAS_ROOT_PATH}/${thumbFileName}`;
    
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

// ==========================================
// [POST] /photo/upload-bulk - 다중 사진 업로드 및 데이터 저장 (태그, 카테고리 포함)
// ==========================================
// 💡 주의: upload.array('files', 20)을 사용하여 최대 20장까지 배열로 받습니다.
router.post('/upload-bulk', upload.array('files', 20), async (req, res) => {
    let connection;
    try {
        const files = req.files;
        // 프론트에서 JSON.stringify()로 묶어서 보낸 데이터를 다시 배열 객체로 풉니다.
        const itemsData = JSON.parse(req.body.itemsData); 
        const { uploadType, userNo } = req.body;

        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: '파일이 없습니다.' });
        }
        if (files.length !== itemsData.length) {
            return res.status(400).json({ success: false, message: '파일과 데이터의 개수가 일치하지 않습니다.' });
        }

        connection = await db.getConnection();
        // 💡 오라클은 기본적으로 Auto-Commit이 false이므로, 모든 작업이 끝나고 commit()을 해야 반영됩니다.

        // 각 파일과 데이터를 순회하며 순차적으로 처리합니다.
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const data = itemsData[i];

            // 1. 이미지 리사이징 및 NAS 업로드 (기존 uploadToNAS 함수 재사용)
            const ext = path.extname(file.originalname);
            const baseName = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
            const originalFileName = `${baseName}${ext}`;
            const thumbFileName = `thumb_${baseName}.webp`;

            const thumbBuffer = await sharp(file.buffer)
                .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // NAS 서버로 파일 전송 (SFTP)
            await uploadToNAS(file.buffer, thumbBuffer, originalFileName, thumbFileName);

            // 2. PS_PHOTO 테이블에 데이터 INSERT (공개여부 포함)
            const insertPhotoSql = `
                INSERT INTO PS_PHOTO (
                    PHOTO_ID, USER_NO, TITLE, DESCRIPTION, IMAGE_URL, THUMB_URL,
                    CAMERA_MODEL, LENS, FOCAL_LENGTH, APERTURE, SHUTTER_SPEED, ISO, LOCATION, IS_PUBLIC
                ) VALUES (
                    PS_PHOTO_SEQ.NEXTVAL, :userNo, :title, :description, :imageName, :thumbName,
                    :model, :lens, :focal, :aperture, :shutter, :iso, :location, :isPublic
                )
                RETURNING PHOTO_ID INTO :newPhotoId
            `;
            
            const photoResult = await connection.execute(insertPhotoSql, {
                userNo: userNo || 1, 
                title: data.title || '제목 없음',
                description: data.description || '',
                imageName: originalFileName,
                thumbName: thumbFileName,
                model: data.meta?.Model || null,
                lens: data.meta?.LensModel || null,
                focal: data.meta?.FocalLength ? String(data.meta.FocalLength) : null,
                aperture: data.meta?.FNumber ? String(data.meta.FNumber) : null,
                shutter: data.meta?.ExposureTime ? String(data.meta.ExposureTime) : null,
                iso: data.meta?.ISO ? String(data.meta.ISO) : null,
                location: data.location || null,
                isPublic: data.isPublic || 'Y', // 기본값 공개
                newPhotoId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            });

            // 생성된 사진 ID 가져오기
            const generatedPhotoId = photoResult.outBinds.newPhotoId[0];

            // 3. 카테고리 저장 (선택한 경우만)
            if (data.categoryId) {
                const insertCatSql = `
                    INSERT INTO PS_PHOTO_CATEMAP (MAPPING_ID, PHOTO_ID, CATEGORY_ID) 
                    VALUES (PS_PHOTO_CATEMAP_SEQ.NEXTVAL, :photoId, :categoryId)
                `;
                await connection.execute(insertCatSql, { 
                    photoId: generatedPhotoId, 
                    categoryId: Number(data.categoryId) 
                });
            }

            // 4. 태그 저장 및 매핑 (핵심 로직)
            if (data.tags && data.tags.length > 0) {
                for (const tagName of data.tags) {
                    let tagId;
                    
                    // 4-1. 태그가 이미 PS_TAG 테이블에 있는지 검사
                    const checkTagSql = `SELECT TAG_ID FROM PS_TAG_PHOTO WHERE TAG_NAME = :tagName`;
                    const tagResult = await connection.execute(checkTagSql, { tagName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

                    if (tagResult.rows.length > 0) {
                        // 이미 있는 태그면 ID만 가져옴
                        tagId = tagResult.rows[0].TAG_ID;
                    } else {
                        // 4-2. 없는 태그면 새로 INSERT 하고 ID를 반환받음
                        const insertTagSql = `
                            INSERT INTO PS_TAG_PHOTO (TAG_ID, TAG_NAME)
                            VALUES (PS_TAG_PHOTO_SEQ.NEXTVAL, :tagName)
                            RETURNING TAG_ID INTO :newTagId
                        `;
                        const newTagResult = await connection.execute(insertTagSql, {
                            tagName: tagName,
                            newTagId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
                        });
                        tagId = newTagResult.outBinds.newTagId[0];
                    }

                    // 4-3. 사진 ID와 태그 ID를 연결하는 매핑 테이블(PS_CONTENT_TAG)에 INSERT
                    const insertContentTagSql = `
                        INSERT INTO PS_PHOTO_TAGMAP (MAPPING_ID, TAG_ID, PHOTO_ID)
                        VALUES (PS_PHOTO_TAGMAP_SEQ.NEXTVAL, :tagId, :photoId)
                    `;
                    await connection.execute(insertContentTagSql, { tagId: tagId, photoId: generatedPhotoId });
                }
            }
        } // for 루프 끝 (모든 사진 처리 완료)

        // 5. 💡 모든 작업이 에러 없이 끝났다면 완전 승인 (Commit)
        await connection.commit();
        res.status(200).json({ success: true, message: '업로드가 완료되었습니다.' });

    } catch (error) {
        console.error("다중 업로드 에러:", error);
        // 💡 중간에 하나라도 에러가 나면 롤백하여 DB 쓰레기 데이터 방지
        if (connection) {
            try { 
                await connection.rollback(); 
                console.log("트랜잭션 롤백 완료");
            } catch (e) { 
                console.error("롤백 실패:", e); 
            }
        }
        res.status(500).json({ success: false, message: "서버 처리 중 오류가 발생했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

/// ==========================================
// [GET] /photo - 사진 전체 목록 조회 (NJS-098 에러 복구 및 중복 방지 완료)
// ==========================================
router.get('/', async (req, res) => {
    let connection;
    try {
        const { category, sort } = req.query;
        connection = await db.getConnection();

        // 💡 목록 조회용 바인드 파라미터 초기화
        const bindParams = {};

        let sql = `
            SELECT 
                P.PHOTO_ID, P.USER_NO, P.TITLE, P.IMAGE_URL, P.THUMB_URL, P.VIEW_COUNT, P.LIKE_COUNT,
                NVL(S.SCRAP_COUNT, 0) AS SCRAP_COUNT,
                NVL(CM.COMMENT_COUNT, 0) AS COMMENT_COUNT,
                (
                    SELECT LISTAGG(C.CATEGORY_NAME, ', ') WITHIN GROUP (ORDER BY C.CATEGORY_NAME)
                    FROM PS_PHOTO_CATEMAP PC
                    JOIN PS_CATEGORY_PHOTO C ON PC.CATEGORY_ID = C.CATEGORY_ID
                    WHERE PC.PHOTO_ID = P.PHOTO_ID
                ) AS CATEGORY_NAME
            FROM PS_PHOTO P
            LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE GROUP BY PHOTO_ID) S ON P.PHOTO_ID = S.PHOTO_ID
            LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS COMMENT_COUNT FROM PS_COMMENT_TABLE GROUP BY PHOTO_ID) CM ON P.PHOTO_ID = CM.PHOTO_ID
            WHERE 1=1
        `;

        // 카테고리가 있을 때만 안전하게 :category 바인딩 추가
        if (category && category.trim() !== '' && category !== 'undefined') {
            const parsedCategory = Number(category);
            if (!isNaN(parsedCategory)) { 
                sql += ` AND P.PHOTO_ID IN (SELECT PHOTO_ID FROM PS_PHOTO_CATEMAP WHERE CATEGORY_ID = :category)`;
                bindParams.category = parsedCategory; // 👈 여기서 값을 채워주므로 에러가 나지 않습니다.
            }
        }

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
            sql += ` ORDER BY P.PHOTO_ID DESC`;
        }

        const result = await connection.execute(sql, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

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
// [GET] /photo/:id - 사진 상세 단건 및 댓글 조회 (태그 테이블명 오류 수선 완료)
// ==========================================
router.get('/:id', async (req, res) => {
    let connection;
    const photoId = Number(req.params.id); 
    try {
        const userNo = req.query.userNo ? Number(req.query.userNo) : 0;
        
        connection = await db.getConnection();

        // 0. 조회수 증가
        await connection.execute(`UPDATE PS_PHOTO SET VIEW_COUNT = VIEW_COUNT + 1 WHERE PHOTO_ID = :photoId`, { photoId }, { autoCommit: true });

        // 💡 1. 메인 사진 정보 조회 
        const photoSql = `
            SELECT 
                P.*, UI.NICKNAME, UI.PROFILE_IMAGE_URL,
                (SELECT COUNT(*) FROM PS_LIKE_TABLE WHERE PHOTO_ID = P.PHOTO_ID AND USER_NO = :userNo) AS IS_LIKED_BY_ME,
                (SELECT COUNT(*) FROM PS_SCRAP_TABLE WHERE PHOTO_ID = P.PHOTO_ID AND USER_NO = :userNo) AS IS_SCRAPPED_BY_ME,
                (SELECT COUNT(*) FROM PS_SCRAP_TABLE WHERE PHOTO_ID = P.PHOTO_ID) AS SCRAP_COUNT,
                -- 💡 [추가됨] 현재 로그인한 유저가 이 사진의 작성자를 팔로우 중인지 판별
                (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWER_NO = :userNo AND FOLLOWING_NO = P.USER_NO) AS IS_FOLLOWING_BY_ME,
                (
                    SELECT LISTAGG(C.CATEGORY_NAME, ', ') WITHIN GROUP (ORDER BY C.CATEGORY_NAME)
                    FROM PS_PHOTO_CATEMAP PC
                    JOIN PS_CATEGORY_PHOTO C ON PC.CATEGORY_ID = C.CATEGORY_ID
                    WHERE PC.PHOTO_ID = P.PHOTO_ID
                ) AS CATEGORY_NAME,
                (
                    SELECT LISTAGG(T.TAG_NAME, ', ') WITHIN GROUP (ORDER BY T.TAG_NAME)
                    FROM PS_PHOTO_TAGMAP PT
                    JOIN PS_TAG_PHOTO T ON PT.TAG_ID = T.TAG_ID
                    WHERE PT.PHOTO_ID = P.PHOTO_ID
                ) AS TAGS
            FROM PS_PHOTO P
            LEFT JOIN PS_USER_INFO UI ON P.USER_NO = UI.USER_NO
            WHERE P.PHOTO_ID = :photoId
        `;

        const photoResult = await connection.execute(photoSql, { photoId, userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (photoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "사진을 찾을 수 없습니다." });
        }

        const photoData = photoResult.rows[0];
        photoData.IMAGE_URL = photoData.IMAGE_URL && photoData.IMAGE_URL.startsWith('http') ? photoData.IMAGE_URL : `${process.env.NAS_BASE_URL}/${photoData.IMAGE_URL}`;
        photoData.THUMB_URL = photoData.THUMB_URL && photoData.THUMB_URL.startsWith('http') ? photoData.THUMB_URL : `${process.env.NAS_BASE_URL}/${photoData.THUMB_URL}`;

        if (photoData.PROFILE_IMAGE_URL && !photoData.PROFILE_IMAGE_URL.startsWith('http')) {
            const profileBaseUrl = process.env.NAS_BASE_URL_PROFILE;

            if (profileBaseUrl) {
                // .env 변수가 존재할 때만 정상적으로 주소를 조립합니다.
                photoData.PROFILE_IMAGE_URL = `${profileBaseUrl}/${photoData.PROFILE_IMAGE_URL}`;
            } else {
                // 💡 만약 .env 변수가 없다면 절대 하드코딩된 주소를 붙이지 않습니다.
                // 대신 서버 로그에 아주 강력한 경고를 남겨 개발자가 정의하도록 유도합니다.
                console.error("❌ CRITICAL CONFIG ERROR: .env 파일에 'NAS_BASE_URL_PROFILE' 변수가 정의되지 않았습니다. 프로필 이미지를 정상적으로 불러올 수 없습니다.");
                
                // 팁: 이미지 주소를 조립하지 않음으로써 프론트엔드에서는 엑스박스가 뜨게 되지만, 
                // 이것은 소스 코드에 보안적 위험 요소를 남기는 것보다 훨씬 안전한 선택입니다.
                // 필요하다면 여기서 user.PROFILE_IMAGE_URL = null; 처리를 하여 기본 이모티콘이 뜨게 할 수도 있습니다.
            }
        }

        // ==========================================================
        // 2. 댓글 목록 조회 (닉네임 가져오도록 JOIN 보강 완료 🟢)
        // ==========================================================
        const commentSql = `
            SELECT 
                C.COMMENT_ID, 
                C.USER_NO, 
                C.CONTENT, 
                TO_CHAR(C.CREATED_AT, 'YYYY-MM-DD HH24:MI') AS CREATED_AT,
                UI.NICKNAME -- 💡 유저 테이블에서 닉네임을 함께 가져옵니다.
            FROM PS_COMMENT_TABLE C
            JOIN PS_USER_INFO UI ON C.USER_NO = UI.USER_NO
            WHERE C.PHOTO_ID = :photoId
            ORDER BY C.COMMENT_ID DESC
        `;
        const commentResult = await connection.execute(commentSql, { photoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

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
// [POST] /photo/:id/like - 좋아요 토글 (최종 완성본)
// ==========================================
router.post('/:id/like', async (req, res) => {
    let connection;
    try {
        const photoId = req.params.id;
        const { isLiked, userNo } = req.body; // 💡 여기서 userNo를 받아옵니다.
        connection = await db.getConnection();

        if (isLiked) {
            // 1. 좋아요 처리
            await connection.execute(
                `INSERT INTO PS_LIKE_TABLE (LIKE_ID, USER_NO, PHOTO_ID, CREATED_AT) VALUES (PS_LIKE_TABLE_SEQ.NEXTVAL, :userNo, :photoId, SYSDATE)`,
                { userNo, photoId }, { autoCommit: false }
            );
            await connection.execute(`UPDATE PS_PHOTO SET LIKE_COUNT = LIKE_COUNT + 1 WHERE PHOTO_ID = :photoId`, { photoId }, { autoCommit: false });

            // 💡 [알림 추가 로직] 좋아요를 누른 상태(isLiked === true)일 때만 알림을 생성합니다.
            const ownerSql = `SELECT USER_NO FROM PS_PHOTO WHERE PHOTO_ID = :photoId`;
            const ownerResult = await connection.execute(ownerSql, { photoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

            if (ownerResult.rows.length > 0) {
                const receiverNo = ownerResult.rows[0].USER_NO;

                // 💡 senderNo 대신 위에서 정의된 userNo를 사용합니다.
                if (userNo !== receiverNo) {
                    const notiSql = `
                        INSERT INTO PS_NOTIFICATION (
                            NOTI_ID, RECEIVER_NO, SENDER_NO, TYPE_ID, PHOTO_ID, POST_ID, IS_READ
                        ) VALUES (
                            PS_NOTIFICATION_SEQ.NEXTVAL, :receiverNo, :userNo, 1, :photoId, NULL, 'N'
                        )
                    `;
                    // 💡 바인딩 객체도 userNo로 매칭해줍니다.
                    await connection.execute(notiSql, { receiverNo, userNo, photoId }, { autoCommit: false });
                }
            }
        } else {
            // 2. 좋아요 취소 처리
            await connection.execute(
                `DELETE FROM PS_LIKE_TABLE WHERE USER_NO = :userNo AND PHOTO_ID = :photoId`,
                { userNo, photoId }, { autoCommit: false }
            );
            await connection.execute(`UPDATE PS_PHOTO SET LIKE_COUNT = GREATEST(LIKE_COUNT - 1, 0) WHERE PHOTO_ID = :photoId`, { photoId }, { autoCommit: false });
            
            // 💡 좋아요를 취소할 때는 알림을 생성하지 않고 자연스럽게 넘어갑니다.
        }
        
        await connection.commit(); // 트랜잭션 전체 확정 (좋아요 + 알림 일괄 성공)
        res.json({ success: true });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("사진 좋아요 처리 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [POST] /photo/:id/scrap - 스크랩 토글 처리 (알림 추가 버전)
// ==========================================
router.post('/:id/scrap', async (req, res) => {
    let connection;
    const photoId = req.params.id;
    const { isScrapped, userNo } = req.body; 
    const finalUserNo = userNo || 1; // 기본값 방어 코드

    try {
        connection = await db.getConnection();
        
        if (isScrapped) {
            // 1. 스크랩 설정
            const insertSql = `
                INSERT INTO PS_SCRAP_TABLE (SCRAP_ID, USER_NO, PHOTO_ID)
                VALUES (PS_SCRAP_TABLE_SEQ.NEXTVAL, :finalUserNo, :photoId)
            `;
            // 💡 안전하게 autoCommit: false 설정
            await connection.execute(insertSql, { finalUserNo, photoId }, { autoCommit: false });

            // 💡 [알림 추가 로직] 사진의 원작자(RECEIVER_NO) 알아내기
            const ownerSql = `SELECT USER_NO FROM PS_PHOTO WHERE PHOTO_ID = :photoId`;
            const ownerResult = await connection.execute(ownerSql, { photoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

            if (ownerResult.rows.length > 0) {
                const receiverNo = ownerResult.rows[0].USER_NO;

                // 💡 본인이 본인 글을 스크랩한 게 아닐 때만 5번(SCRAP) 알림 생성!
                if (finalUserNo !== receiverNo) {
                    const notiSql = `
                        INSERT INTO PS_NOTIFICATION (
                            NOTI_ID, RECEIVER_NO, SENDER_NO, TYPE_ID, PHOTO_ID, POST_ID, IS_READ
                        ) VALUES (
                            PS_NOTIFICATION_SEQ.NEXTVAL, :receiverNo, :finalUserNo, 5, :photoId, NULL, 'N'
                        )
                    `;
                    await connection.execute(notiSql, { receiverNo, finalUserNo, photoId }, { autoCommit: false });
                }
            }
        } else {
            // 2. 스크랩 취소
            const deleteSql = `
                DELETE FROM PS_SCRAP_TABLE 
                WHERE USER_NO = :finalUserNo AND PHOTO_ID = :photoId
            `;
            await connection.execute(deleteSql, { finalUserNo, photoId }, { autoCommit: false });
            
            // 💡 스크랩 취소 시에는 알림을 생성하지 않습니다.
        }

        // 스크랩 행위와 알림 저장을 하나의 트랜잭션으로 일괄 커밋
        await connection.commit();
        res.json({ success: true, message: "스크랩 업데이트 완료" });
    } catch (error) {
        // 💡 에러 발생 시 안전하게 롤백
        if (connection) await connection.rollback();
        console.error("스크랩 업데이트 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [POST] /photo/:id/comment - 댓글 등록 API (하드코딩 완벽 제거 버전)
// ==========================================
router.post('/:id/comment', async (req, res) => {
    let connection;
    const photoId = req.params.id;
    const { content, userNo } = req.body; 

    // 💡 1. 1번으로 강제 할당하던 로직 삭제!
    // const finalUserNo = userNo || 1; (이 줄을 지워버립니다)

    // 💡 2. 유저 번호가 안 넘어오면 에러로 튕겨내도록 유효성 검사 추가
    if (!userNo) {
        return res.status(401).json({ success: false, message: '로그인 정보가 없습니다. (userNo 누락)' });
    }

    if (!content || content.trim() === '') {
        return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
    }

    try {
        connection = await db.getConnection();

        // 💡 3. insertSql과 notiSql의 :finalUserNo 부분을 전부 :userNo로 변경
        const insertSql = `
            INSERT INTO PS_COMMENT_TABLE (COMMENT_ID, USER_NO, PHOTO_ID, CONTENT)
            VALUES (PS_COMMENT_TABLE_SEQ.NEXTVAL, :userNo, :photoId, :content)
        `;
        await connection.execute(insertSql, { userNo, photoId, content }, { autoCommit: false });

        const ownerSql = `SELECT USER_NO FROM PS_PHOTO WHERE PHOTO_ID = :photoId`;
        const ownerResult = await connection.execute(ownerSql, { photoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (ownerResult.rows.length > 0) {
            const receiverNo = ownerResult.rows[0].USER_NO;

            if (userNo !== receiverNo) {
                const notiSql = `
                    INSERT INTO PS_NOTIFICATION (
                        NOTI_ID, RECEIVER_NO, SENDER_NO, TYPE_ID, PHOTO_ID, POST_ID, IS_READ
                    ) VALUES (
                        PS_NOTIFICATION_SEQ.NEXTVAL, :receiverNo, :userNo, 2, :photoId, NULL, 'N'
                    )
                `;
                await connection.execute(notiSql, { receiverNo, userNo, photoId }, { autoCommit: false });
            }
        }

        await connection.commit();
        res.json({ success: true, message: "댓글이 성공적으로 등록되었습니다." });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("댓글 등록 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// 2. [POST] /photo/toggle - 팔로우 / 팔로우 취소 처리 (중복 코드 정돈 버전)
// ==========================================
router.post('/toggle', async (req, res) => {
    let connection;
    try {
        const { followerNo, followingNo } = req.body;
        connection = await db.getConnection();

        // 1. 현재 팔로우 상태인지 확인
        const checkSql = `SELECT FOLLOW_ID FROM PS_FOLLOW WHERE FOLLOWER_NO = :followerNo AND FOLLOWING_NO = :followingNo`;
        const checkResult = await connection.execute(checkSql, { followerNo, followingNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        let action = '';
        if (checkResult.rows.length > 0) {
            // 2-A. 이미 팔로우 중이면 -> DELETE (팔로우 취소)
            const deleteSql = `DELETE FROM PS_FOLLOW WHERE FOLLOWER_NO = :followerNo AND FOLLOWING_NO = :followingNo`;
            await connection.execute(deleteSql, { followerNo, followingNo }, { autoCommit: false });
            action = 'unfollowed';
        } else {
            // 2-B. 팔로우 중이 아니면 -> INSERT (팔로우)
            const insertSql = `
                INSERT INTO PS_FOLLOW (FOLLOW_ID, FOLLOWER_NO, FOLLOWING_NO) 
                VALUES (PS_FOLLOW_SEQ.NEXTVAL, :followerNo, :followingNo)
            `;
            await connection.execute(insertSql, { followerNo, followingNo }, { autoCommit: false });
            action = 'followed';

            // [알림 추가 로직] 본인이 본인을 팔로우하는 게 아닐 때만 알림 전송
            if (followerNo !== followingNo) {
                const notiSql = `
                    INSERT INTO PS_NOTIFICATION (
                        NOTI_ID, RECEIVER_NO, SENDER_NO, TYPE_ID, PHOTO_ID, POST_ID, IS_READ
                    ) VALUES (
                        PS_NOTIFICATION_SEQ.NEXTVAL, :followingNo, :followerNo, 3, NULL, NULL, 'N'
                    )
                `;
                await connection.execute(notiSql, { followingNo, followerNo }, { autoCommit: false });
            }
        }

        await connection.commit();
        res.json({ success: true, action });

    } catch (error) {
        console.error("팔로우 토글 에러:", error);
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error("롤백 실패:", e); }
        }
        res.status(500).json({ success: false, message: "팔로우 처리 중 오류가 발생했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

module.exports = router;