const express = require('express');
const app = express();
const userModal = require('./models/user')
const postModal = require('./models/post');
const cookieParser = require('cookie-parser');
const  jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const user = require('./models/user');
const crypto = require('crypto');
const multer = require('multer')
const path = require('path')

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12,(err,bytes)=>{
        const fn = bytes.toString('hex') + path.extname(file.originalname)
        cb(null, fn)
    })
    
  }
})

const upload = multer({ storage: storage })


app.set('view engine', 'ejs');

app.get('/' , (req,res)=>{
    res.render('index')
})

function isLoggedIn(req , res , next){
    if(req.cookies.token == '') res.send('you must be logged in')
    else {
        let data =  jwt.verify(req.cookies.token, 'secret')
        req.user = data
        next();
    }
    
}

app.post('/create', (req,res)=>{
    let {name , username , email , password} = req.body;

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt,async(err,hash)=>{
            let user = await userModal.create({
            name,
            username,
            email,
            password: hash,
        })
            user.save();
            let token = jwt.sign({email, userid: user._id},"secret");
            res.cookie('token',token);
            res.send('ok')
        })
    })
    
})

app.get('/login',(req,res)=>{
    res.render('login')
})

app.post('/login',async (req,res)=>{
    let {email,password} = req.body;
    let user = await userModal.findOne({email});
    if(!user) return res.send('something went wrong');
    bcrypt.compare(password , user.password , (err,result)=>{
        if(result)  {
            let token = jwt.sign({email, userid: user._id},"secret");
            res.cookie('token',token);
            res.status(200).send('you can login')
            
        }

        else  res.redirect('/login');
    })

})

app.get('/profile', isLoggedIn ,async (req,res)=>{
    let user = await userModal.findOne({email: req.user.email})
    await user.populate('posts')
    res.render('profile',{user});
    
})

app.get('/like/:id', isLoggedIn , async (req,res)=>{
    let post = await postModal.findOne({_id: req.params.id}).populate('user')
   
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid)
    }
    else {
        post.likes.splice(post.likes.indexOf(req.user.userid),1)
    }
    
    await post.save();
    res.redirect('/profile')
   
})

app.post('/post', isLoggedIn ,async (req,res)=>{
    let user = await userModal.findOne({email: req.user.email})
    let {content} = req.body;

    let post = await postModal.create({
        user: user._id,
        content,
    })

     user.posts.push(post._id)
    await user.save();

    res.redirect('/profile');
})

app.get('/logout',(req, res)=>{
    res.cookie("token",'');
    res.redirect('/');
})

app.get('/edit/:id', async (req,res)=>{
    let post = await postModal.findOne({_id: req.params.id}).populate('user')
    
    res.render('edit', {post})
})

app.post('/update/:id', async (req,res)=>{
    let post = await postModal.findOneAndUpdate({_id: req.params.id},{content: req.body.content})
    
    res.redirect('/profile')
})

app.post('/upload',upload.single('image'),(req,res)=>{
    res.render('upload');
})


app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

