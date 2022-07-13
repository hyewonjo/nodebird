const passport = require('passport');
const local = require('./localStrategy');
const kakao = require('./kakaoStrategy');
const User = require('../models/user');

module.exports = () => {
    passport.serializeUser((user, done) => {
        console.log("in serializeUser");
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => { // 매 요청마다 실행됨.
        console.log("in deserializeUser");
        User.findOne({ // todo 레디스에 캐싱해놓고 조회하도록 수정
            where: {id},
            include: [{
                model: User,
                attributes: ['id', 'nick'],
                as: 'Followers',
            }, {
                model: User,
                attributes: ['id', 'nick'],
                as: 'Followings',
            }],
        })
            .then(user => done(null, user)) // req.user에 user 저장
            .catch(err => done(err));
    });

    local();
    kakao();
}