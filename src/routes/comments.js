import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middleware/auth.js'
import Joi from 'joi';

const router = express.Router(); // express.Router()를 이용해 라우터를 생성합니다.

//댓글 생성
// src/routes/comments.router.js

/** 댓글 생성 API **/
const commentSchema = Joi.object({
  comment: Joi.string().required(),
});

router.post('/', authMiddleware, async (req, res, next) => {
    try{
    const validation = await commentSchema.validateAsync(req.body);
    const { comment } = validation;

    const postId = req.postId;
    const { userId } = req.user;

    const post = await prisma.posts.findFirst({
      where: {
        postId: +postId,
      },
    });
    if (!post)
      return res.status(404).json({ message: '작성할 게시글이 존재하지 않습니다.' });

    const CreatedComment = await prisma.comments.create({
      data: {
        UserId: +userId, // 댓글 작성자 ID
        PostId: +postId, // 댓글 작성 게시글 ID
        comment: comment,
      },
    });
    return res.status(201).json({ message: "댓글을 작성하였습니다." });

  }catch(err){
    console.log(err);
    if (err.name === 'ValidationError') {
      return res.status(412).json({ errorMessage: "데이터 형식이 올바르지 않습니다." });
    }
    return res.status(400).json({errorMessage: "댓글 작성에 실패하였습니다."});
  }
  });


/** 댓글 조회 API **/
router.get('/', async (req, res, next) => {
  try{
   const postId=req.postId;

  const post = await prisma.posts.findFirst({
    where: {
      postId: +postId,
    },
  });
  if (!post)
    return res.status(404).json({ message: '게시글이 존재하지 않습니다.' });

  let comments = await prisma.comments.findMany({
    where: {
      PostId: +postId,
    },
    select: {
      commentId :true,
      UserId : true,
      comment: true,
      createdAt: true,
      updatedAt: true,
      User : {
        select: {
          nickname: true, // 작성자의 닉네임 필드만 선택합니다.
        },
      },
    },
    orderBy: {
      createdAt: 'desc', // 게시글을 최신순으로 정렬합니다.
    },
  });
  
  comments = comments.map((x)=>{
    return {
      commentId : x.commentId,
      userId: x.UserId,
      nickname : x.User.nickname,
      comment: x.comment,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
    }
  })

  return res.status(200).json({ comments: comments });
}catch(err){
  console.log(err);
  return res.status(400).json({errorMessage : "댓글 조회에 실패하였습니다."})
}
});

//댓글 수정 
router.put('/:commentId', authMiddleware, async (req, res, next) => {
    try{
    const validation = await commentSchema.validateAsync(req.body);
    const { comment } = validation;
    const postId = req.postId;
    const { commentId } = req.params;
    const {userId} = req.user;


    const post = await prisma.posts.findFirst({
        where: { postId: +postId },
      });
    
      if(!post) return res.status(400).json({message:'게시글이 존재하지 않습니다.'})
    
    if(post.UserId!==userId){
      return res.status(403).json({errMessage :"댓글의 수정권한이 존재하지 않습니다."})
    }

    const targetComment = await prisma.comments.findUnique({
      where: { PostId: +postId, commentId : +commentId},
    });
  
    if (!targetComment)
      return res.status(404).json({ message: '댓글이 존재하지 않습니다.' });
  
    let result = await prisma.comments.update({
      data: { comment },
      where: {
        PostId: +postId,
      commentId : +commentId,
      },
    });
    if(!result){return res.status(400).json({errMessage : '댓글 수정이 정상적으로 처리되지 않았습니다.'})}

    return res.status(200).json({ data: '댓글을 수정하였습니다.' });
  }catch(err){
    console.log(err);
    if (err.name === 'ValidationError') {
      return res.status(412).json({ errorMessage: '데이터 형식이 올바르지 않습니다.' });
    }
    return res.status(400).json({errMessage : '댓글 수정에 실패하였습니다.'})
  }
  });

  //댓글 삭제
  router.delete('/:commentId', authMiddleware, async (req, res, next) => {
    try{
    const postId = req.postId;
    const { commentId } = req.params;

    const post = await prisma.posts.findFirst({
        where: { postId: +postId },
      });
    
    if(!post) return res.status(404).json({message:'게시글이 존재하지 않습니다.'})
  
    const targetComment = await prisma.comments.findFirst({ where: { PostId: +postId, commentId :+commentId } });
  
    if (!targetComment)
      return res.status(404).json({ message: '댓글이 존재하지 않습니다.' });
  
    let result = await prisma.comments.delete({ where: { PostId: +postId, commentId : +commentId } });
    
    if(!result) return res.status(400).json({errMessage : '댓글 삭제가 정상적으로 처리되지 않았습니다.'})
  
    return res.status(200).json({ data: '게시글을 삭제하였습니다.' });
}catch(err){
    console.log(err);
    return res.status(400).json({errMessage : '댓글 삭제에 실패하였습니다.'})
}
});




  export default router;



  


