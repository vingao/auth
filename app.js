var bodyParser = require('body-parser');
var csrf = require('csurf');
var bcrypt = require('bcryptjs');
var express = require('express');
var mongoose = require('mongoose');
var sessions = require('client-sessions');
var util = require('util');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

mongoose.connect('mongodb://localhost/newauth');

var User = mongoose.model('User', new Schema({
    id: ObjectId,
    firstName: String,
    lastName: String,
    email: {type: String, unique: true},
    password: String
}));

var app = express();
app.set('view engine', 'jade');
app.locals.pretty = true;

// middleware
app.use(bodyParser.urlencoded({extended: true}));

app.use(sessions({
    cookieName: 'session', // cookie name dictates the key name added to the request object
    secret: '1', // should be a large unguessable string
    duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
    activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
}));

//app.use(csrf());

app.use(function(req, res, next) {
    console.log('cookies:', req.cookies);
    console.log('signedCookies:', req.signedCookies);
    console.log('session:', util.inspect(req.session));
    next();
})

app.use(function (req, res, next) {
    console.log('req: ' + req.method + ' ' + req.url);
    if (req.session && req.session.user) {
        User.findOne({email: req.session.user.email}, function (err, user) {
            if (user) {
                console.log('session user: ' + util.inspect(req.session.user));
                console.log('user from db: ' + util.inspect(user));
                req.user = user;
                delete req.user.password;
                console.log('req.user: ' + util.inspect(req.user));
                req.session.user = req.user;
                console.log('new session user: ' + util.inspect(req.session.user));
                res.locals.user = req.user;
            }
            next();
        })
    } else {
        next();
    }
})

function requireLogin(req, res, next) {
    if (!req.user) {
        res.redirect('/login');
    } else {
        next();
    }
}


app.get('/', function (req, res) {
    res.render('index.jade');
});

app.get('/test', function (req, res) {
    res.send(util.inspect(req.session));
})
app.get('/register', function (req, res) {
    res.render('register.jade'); //, {csrfToken: req.csrfToken()});
});

app.post('/register', function (req, res) {
    var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
    var user = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: hash
    });

    user.save(function (err) {
        if (err) {
            var error = 'Something bad heppened! Tye again!';
            if (err.code === 11000) {
                error = "That email is already taken, try another.";
            }
            res.render('register.jade', {error: error});
        } else {
            res.redirect("/dashboard");
        }
    });

});

app.get('/login', function (req, res) {
    res.render('login.jade');//, {csrfToken: req.csrfToken()});
});

app.post('/login', function (req, res) {
    User.findOne({email: req.body.email}, function (err, user) {
        if (err) {
            res('error: ' + err);
        } else {
            if (!user) {
                res.render('login.jade', {error: 'Invalid email or password'});
            } else {
                if (bcrypt.compareSync(req.body.password, user.password)) {
                    req.session.user = user;
                    res.redirect('/dashboard');
                } else {
                    console.log("pass=" + req.body.password);
                    console.log("pass in db=" + user.password);
                    res.render('login.jade', {error: 'Invalid  email or password'});
                }
            }
        }
    });
});

app.get('/dashboard', requireLogin, function (req, res) {
    res.render('dashboard.jade');
});

app.get('/logout', function (req, res) {
    req.session.reset();
    res.redirect('/');
});

app.listen(3000);
