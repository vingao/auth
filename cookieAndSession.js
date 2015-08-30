var express = require('express');
var util = require('util');
var app = express();

app.use(express.cookieParser('test'));
//app.use(express.session({secret:'yoursecret', cookie:{maxAge:6000}}));
app.use(express.cookieSession());

app.use(function(req, res, next) {
    console.log('cookies:', req.cookies);
    console.log('signedCookies:', req.signedCookies);
    console.log('session:', util.inspect(req.session));
    next();
})
app.get('/counter', function (req, res) {

    var count = req.cookies.count || 0;
    count++;
    res.cookie('count', count, { signed: false });

    var signedCount = req.signedCookies.signedCount || 0;
    signedCount++;
    res.cookie('signedCount', signedCount, { signed: true });

    //req.session
    req.session['primary skill'] = 'Dancing';

    res.send('Count: ' + count + ' signedCount: ' + signedCount);
});

app.listen(3000);