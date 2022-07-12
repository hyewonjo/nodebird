const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const User = require('../models/user');
module.exports = () => {
    passport.use(new LocalStrategy({ // 전략에 관한 설정
        usernameField: 'email', // req.body 속성명
        passworeField: 'password',
    },
        /*
        실제 전략을 수행하는 함수. 첫번째 인수에서 넣어준 email과 password가 인수로 들어간다.
        done 함수는 passport.authenticate 의 콜백 함수.
         */
    async(email, password, done) => {
        try {
            const exUser = await User.findOne({where: {email}});
            if (exUser) {
                const result = await bcrypt.compare(password, exUser.password);
                if (result) {
                    done(null, exUser); // 두번째 인수를 사용하지 않는 경우는 로그인에 실패했을 때뿐. 첫번째 인수를 사용하는 경우는 서버 에러 발생했을 때
                } else {
                    done(null, false, { message: '비밀번호가 일치하지 않습니다.'}); // 세번째 인수는 비밀번호가 일치하지 않거나 존재하지 않는 회원일 때와 같은 사용자 정의 에러 발생시. info 객체
                }
            } else {
                done(null, false, { message: '가입되지 않은 회원입니다.'});
            }
        } catch (error) {
            console.error(error);
            done(error); // 서버 에러 발생했으니 첫번째 인수로 error
        }
    }));
};