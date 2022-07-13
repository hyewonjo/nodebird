const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');
const User = require('../models/user');

const router = express.Router();

router.post('/join', isNotLoggedIn, async(req, res, next) => {
    const { email, nick, password } = req.body;
    try {
        const exUser = await User.findOne({ where: { email }});
        if (exUser) {
            return res.redirect('/join?error=exist');
        }
        const hash = await bcrypt.hash(password, 12); // 12 이상 추천, 최대 31
        await User.create({
            email,
            nick,
            password: hash,
        });
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.post('/login', isNotLoggedIn, (req, res, next) => {
   passport.authenticate('local', (authError, user, info) => { // authError 로그인 실패시, user 로그인 성공시
       if (authError) {
           console.error(authError);
           return next(authError);
       }
       if (!user) {
           return res.redirect(`/?loginError=${info.message}`);
       }
       // 로그인 성공시 req.login 호출
       // Passport는 req객체에 login, logout 메서드를 추가한다.
       return req.login(user, (loginError) => { // req.login에 제공하는 user 객체가 serializeUser로 넘어가게 된다.
           if (loginError) {
               console.error(loginError);
               return next(loginError);
           }
           console.log('in req.login');
           return res.redirect('/');
       });
   })(req, res, next); // 미들웨어 안에서 미들웨어에 사용자 정의 기능을 추가하고 싶을 때 (req, res, next)를 인수로 준다.
});

router.get('/logout', isLoggedIn, (req, res, next) => {
    if (req.user.provider === 'kakao') {
        // todo 카카오 logout API 호출
    }

    req.logout((err) => { // req.user 객체를 제거한다.
        if (err) {
            return next(err);
        }
        req.session.destroy(); // req.session 객체의 내용을 제거한다.
        res.redirect('/');
    });
});

router.get('/kakao', passport.authenticate('kakao'));
router.get('/kakao/callback', passport.authenticate('kakao', { // 성공 여부 결과를 받는다. 로그인 성공시 내부적으로 req.login을 호출하므로 직접 호출할 필요가 없다.
    failureRedirect: '/', // 실패시 이동할 곳
}), (req, res) => {
    res.redirect('/'); // 성공시 이동할 곳
});

module.exports = router;