const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const passport = require('passport');
const helmet = require('helmet');
const hpp = require('hpp');
const redis = require('redis');

/*
session 을 인수로 넣어서 호출해야한다.
connect-redis 는 express-session 에 의존성이 있다.
 */
const RedisStore = require('connect-redis')(session);

dotenv.config();
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    password: process.env.REDIS_PASSWORD,
});

const connectRedis = async () => {
    await redisClient.connect();
};
connectRedis().then(r => {
    logger.info(r);
    logger.info('redis connected');
});

const pageRouter = require('./routes/page');
const authRouter = require('./routes/auth');
const postRouter = require('./routes/post');
const userRouter = require('./routes/user');
const {sequelize} = require('./models');
const passportConfig = require('./passport');
// todo winston-daily-rotate-file 적용하기
// todo logger logging 포맷 만들어놓기
const logger = require('./logger');

const app = express();
passportConfig(); // 패스포트 설정
app.set('port', process.env.PORT || 8001);
app.set('view engine', 'html');
nunjucks.configure('views', {
    express: app,
    watch: true,
});

sequelize.sync({force: false})
    .then(() => {
        console.log('데이터베이스 연결 성공');
    })
    .catch((err) => {
        console.error(err);
    });

if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

app.use(helmet());
app.use(hpp({ contentSecurityPolicy: false }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));

const sessionOption = {
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: true,
        secure: false,
    },
    // 기본적으로는 메모리에 세션을 저장하지만 이제는 RedisStore에 저장한다. 옵션으로 client 속성에 생성한 redisClient 객체를 연결하면 된다.
    // store: new RedisStore({client: redisClient}),
};
if (process.env.NODE_ENV === 'production') {
    sessionOption.proxy = true; // https 적용을 위해 노드 서버 앞에 다른 서버를 두었을 때
    sessionOption.cookie.secure = true // https 를 적용할 때
}
app.use(session(sessionOption));

app.use(passport.initialize()); // req 객체에 passport 설정을 심는다
app.use(passport.session()); // req.session 객체에 passport 정보를 저장한다. req.session 객체는 express-session에서 생성하는 것이므로 passport 미들웨어는 express-session 미들웨어보다 뒤에 연결해야 된다.

app.use('/', pageRouter);
app.use('/auth', authRouter);
app.use('/post', postRouter);
app.use('/user', userRouter);

app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

app.use((err, req, res, next) => {
    logger.info('zzzzz');
    logger.error(err);
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

app.listen(app.get('port'), () => {
    console.log(`${app.get('port')}번 포트에서 대기중`);
});
