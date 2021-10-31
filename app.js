//jshint esversion:6
require('dotenv').config();

const express=require("express");
const bodyParser=require('body-parser');
const ejs=require('ejs');
const findorcreate=require('mongoose-findorcreate');
const session = require('express-session');
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy=require('passport-facebook').Strategy;
const GitHubStrategy=require('passport-github2').Strategy;

const mongoose=require('mongoose');

const app=express();
app.set('view engine','ejs')
app.use(express.static('public'));

app.use(bodyParser.urlencoded({
    extended:true
}));

app.use(session({
    secret:"My little secret.",
    resave:false,
    saveUninitialized:false,

}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://wikiDB:wikiDB@cluster0.jcpuu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",{useNewUrlParser:true});

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    githubId:String,
    facebookId:String,
    secret:Array
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findorcreate);



const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/secrets"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ githubId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));





app.get("/",function(req,res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }));


  app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    
    res.redirect("/secrets");
  });



  app.get('/auth/facebook',
  passport.authenticate('facebook'));


  app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect Secrets page.
    res.redirect('/secrets');
  });

  app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }));

app.get('/auth/github/secrets', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});

app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}},function(err,foundUsers){
      if(err){
        console.log(err);
      }else{
        if(foundUsers){
          res.render('secrets',{usersWithSecrets:foundUsers});
        }
      }
    })
});


app.get('/logout',function(req,res){
    req.logout();
    res.redirect('/');
})



app.post('/register',function(req,res){
   User.register({username: req.body.username},req.body.password, function(err,user){
       if(err){
           console.log(err);
           res.redirect('/register');
       }
       else{
           passport.authenticate("local")(req,res,function(){
               res.redirect('/secrets');
           });
       }

   });
   

});


app.post('/login',(req,res)=>{
    const user=new User({
        username:req.body.username,
        password:req.body.password
    });

    req.login(user,function(err){
        if(err) {
            console.log(err);
        }
        else{
            passport.authenticate('local')(req,res,function(){
                res.redirect('/secrets');
            })
            
        }
    })
});


app.get('/submit',function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect('/login');
  }
});

app.post('/submit',(req,res)=>{
  const submittedSecret=req.body.secret;
  console.log(req.user);
  User.findById(req.user.id,(err,foundUser)=>{
    if(err){
      console.log(err);
    }
    else{
      if(foundUser){
        foundUser.secret.push(submittedSecret);
        foundUser.save().then(_=>{
          res.redirect('/secrets');
        });
      }
    }
  });
});




app.listen(3000,()=>{
    console.log("Server is running on localhost 3000");
});