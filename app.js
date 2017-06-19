var express = require('express');
var app = express();
var session = require('express-session');
var cookieParser = require('cookie-parser');
var mongoose  = require('mongoose');
var bodyparser = require('body-parser');
var path = require('path');
var fs = require('fs'); // trabalhar com ficheiros
var multer  = require('multer'); // Para poder fazer uploads
var passport = require('passport') // para login
var LocalStrategy = require('passport-local').Strategy;

app.set('view engine','pug'); // Indica que iremos usar o pugjs para mostrar as paginas, ou seja, paginas html sem fechar as tags html -> www.pugjs.org
app.set('trust proxy','13.81.108.99'); // Força a utilização de ssl

app.use(express.static(path.join(__dirname, '/public')));  // Permite carregar ficheiros que estajam na pasta public
app.use(bodyparser.urlencoded({ extended: true })); // Encripta o url
app.use(bodyparser.json()); // Envia os dados do body atraves de um objecto json

mongoose.connect('mongodb://carlos:123456@ds062889.mlab.com:62889/stand'); // Conecta a base de dados


var Schema = mongoose.Schema; // Schema e objecto que serve para representar objectos da base de dados

var veiculosSchema = new Schema({ // Schema que representa a estrutura da coleção veiculos
	'id' : Number,
	'Marca' : String,
	'Modelo': String,
    'Tipo': String,
    'Preco': String
});

var clientesSchema = new Schema({ // Schema que representa a estrutura da coleção clientes
	'id' : Number,
	'nome' : String,
	'sobrenome': String,
    'password': String
});

var Veiculos = mongoose.model('Veiculos',veiculosSchema,'Veiculos');
var Clientes = mongoose.model('clientes',clientesSchema,'clientes');

var upload = multer({dest:'/uploads'}).single('imagem'); // Para poder fazer uploads


// configuraçao do passport -> http://passportjs.org/docs/configure
passport.use('local',new LocalStrategy(
  function(username, password, done) {
    Clientes.findOne({ username: username }, function(err, user) { // procura cliente na base de dados com username indicado
      if (err) {
          console.log(err);
          return done(err);
      }

      if (!user) {
        console.log("user nao foi encontrado");
        return done(null, false);
      }

      if (user.password != password) {  // verifica se password é valida, https://github.com/passport/express-4.x-local-example/blob/master/server.js
        console.log("Password nao é igual");
        return done(null, false);
      }

      console.log("Login efectuado com sucesso");
      return done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  Clientes.findById(id, function(err, user) {
    done(err, user);
  });
});

app.use(cookieParser());
app.use(session({ secret: 'csimao_mcosta',resave:true, saveUninitialized:true }));
app.use(passport.initialize());
app.use(passport.session());
// fim configuraçao

// verifica se esta feito login -> https://stackoverflow.com/questions/41229507/check-if-user-logged-in-by-passport-strategy-different-user-types/41231296
function fezLogin(req, res, next) {
    if (req.isAuthenticated()) // se user esta autenticado
        return next();  // continua a executar
    res.redirect('/'); // senao faz redirecionamento da pagina para a home
}  

// Rota principal/Home
app.get('/',function(req,res){
	res.render('index',{'user':req.user}); //  Mostra a pagina index.pug
});

// Sobre Nos
app.get('/about',function(req,res){
	res.render('sobre',{'user':req.user}); //  Mostra a pagina sobre.pug
});

// Stands
app.get('/stands',function(req,res){
	res.render('stands',{'user':req.user}); //  Mostra a pagina stands.pug
});

// Mostrar pagina de Login
app.get('/login',function(req,res){
	res.render('login',{'user':req.user}); //  Mostra a pagina login.pug
});

// Veiculos
app.get('/veiculos/:tipoVeiculo',function(req,res){
	var veiculos={};
    var tipoVeiculo = req.params.tipoVeiculo; // tipo de veiculo que é parametro definido no url
    
    var id = 0; // inicializa o id com 0
    var sqlCursor = Veiculos.find({'Tipo':tipoVeiculo}).cursor(); // cursor sql que contem todos os veiculo com o tipo de veiculo tipoVeiculo

    sqlCursor.on('data',function(veiculo){
        if(veiculo){ // se encontrou dados
            veiculos[id] = veiculo; // adiciona ao objecto um novo veiculo com o igual ao valor da var id
            id++; //incrementa id para adicionar o proximo veiculo
        }
    });

    sqlCursor.on('close',function(){
        res.render('veiculos',{'veiculos':veiculos,'user':req.user}); // Mostra a pagina com os veiculos do tipo de veiculo definido no url
    });
});

// Mostra pagina com formulario de adicionar veiculos
app.get('/veiculos/:tipoVeiculo/add',fezLogin,function(req,res){
   res.render('addveiculo' , {'tipo':req.params.tipoVeiculo}); // envia para a pagina com formulario o tipo de veiculo para preencher o campo tipo de veiculo
});

// Fazer login com os dados do formulario -> http://passportjs.org/docs/authenticate
app.post('/login',
    passport.authenticate('local',{
        successRedirect: '/',
        failureRedirect: '/login'
}));

// Adiciona Veiculos
app.post('/veiculos/:tipoVeiculo',fezLogin,upload,function(req,res){
    var tipoVeiculo = req.params.tipoVeiculo;   //valor que vem do url :tipoVeiculo que indica qual o tipo de veiculo estamos a trabalhar
    
    if(tipoVeiculo == req.body.tipo){ // Verifica se o novo veiculo e do mesmo tipo que o indicado no url
        var veiculo = new Veiculos();
        veiculo.Marca = req.body.marca; // valor da marca que vem do formulario
        veiculo.Modelo = req.body.modelo; // valor do modelo que vem do formulario
        veiculo.Tipo = req.body.tipo; // valor do tipo que vem do formulario
        veiculo.Preco = req.body.preco; // valor do preco que vem do formulario
        fs.readFile(req.file.path, function (err, data) { //Ler o ficheiro da imagem
            fs.writeFile(__dirname+'/public/images/'+tipoVeiculo+'/'+veiculo.Marca+'-'+veiculo.Modelo+'.jpg',data,function(err){
                if(err){
                    return console.log(err);
                }
                
                console.log('Imagem guardada');
            });
        });

        veiculo.save(function(err,vei){ // Guarda novo veiculo
            if(vei){
                console.log('Veiculo '+vei._id+' adicionado!'); // log do id do novo veiculo adicionado a bd
                res.send('Veiculo adicionado! </br> <a href="javascript:history.back()"/>');
            }else
                console.log('Erro ao criar novo Veiculo'); // log do erro ao adicionar novo veiculo a bd
        });
    }else{
        res.status(500).send('Veiculo nao adicionado!'); // Mostrar mensagem de erro aos utilizadores.
    }
});

// Edita o veiculo por tipo de Veiculos indicado por :tipoVeiculo, pela sua marca com o /:marca e por modelo atraves de /:modelo
app.put('/veiculos/:tipoVeiculo/:marca/:modelo',fezLogin,upload,function(req,res){
    var tipoVeiculo = req.params.tipoVeiculo;   //valor que vem do url :tipoVeiculo que indica qual o tipo de veiculo estamos a trabalhar
    var marca = req.params.marca;   //valor que vem do url :marca que indica qual a marca de veiculo estamos a trabalhar
    var modelo = req.params.modelo;   //valor que vem do url :modelo que indica qual o modelo de veiculo estamos a trabalhar
    
    Veiculos.findOne({'Marca':marca,'Modelo':modelo,'Tipo':tipoVeiculo},function(err,veiculo){
        if(tipoVeiculo == req.body.tipo){ // Verifica se o novo veiculo e do mesmo tipo que o indicado no url
            veiculo.Marca = req.body.marca; // valor da marca que vem do formulario/put
            veiculo.Modelo = req.body.modelo; // valor do modelo que vem do formulario/put
            veiculo.Tipo = req.body.tipo; // valor do tipo que vem do formulario/put
            veiculo.Preco = req.body.preco; // valor do preco que vem do formulario/put
            fs.readFile(req.file.path, function (err, data) { //Ler o ficheiro da imagem
                fs.writeFile(__dirname+'/public/images/'+tipoVeiculo+'/'+veiculo.Marca+'-'+veiculo.Modelo+'.jpg',data,function(err){
                    if(err){
                        return console.log(err);
                    }
                    
                    console.log('Imagem guardada');
                });
            });

            veiculo.save(function(err,vei){ // Guarda veiculo
                if(vei){
                    console.log('Veiculo '+vei._id+' adicionado!'); // log do id do veiculo actualizado na bd
                    res.send('Veiculo editado! </br> <a href="javascript:history.back()"/>');
                }else
                    console.log('Erro ao editar Veiculo'); // log do erro ao actualizar veiculo na bd
            });
        }else{
            res.status(500).send('Veiculo nao actualizado!'); // Mostrar mensagem de erro aos utilizadores.
        }
    });
});

// Apaga o veiculo por tipo de Veiculos indicado por :tipoVeiculo, pela sua marca com o /:marca e por modelo atraves de /:modelo
app.delete('/veiculos/:tipoVeiculo/:marca/:modelo',fezLogin,upload,function(req,res){
    var tipoVeiculo = req.params.tipoVeiculo;   //valor que vem do url :tipoVeiculo que indica qual o tipo de veiculo estamos a trabalhar
    var marca = req.params.marca;   //valor que vem do url :marca que indica qual a marca de veiculo estamos a trabalhar
    var modelo = req.params.modelo;   //valor que vem do url :modelo que indica qual o modelo de veiculo estamos a trabalhar
    
    Veiculos.findOne({'Marca':marca,'Modelo':modelo,'Tipo':tipoVeiculo},function(err,veiculo){
            veiculo.remove(function(err,vei){ // remove veiculo
                if(vei){
                    console.log('Veiculo '+vei._id+' eliminado!'); // log do id do veiculo eliminado na bd
                    res.send('Veiculo eleminado! </br> <a href="javascript:history.back()"/>');
                }else
                    console.log('Erro ao eliminar Veiculo'); // log do erro ao eliminar veiculo na bd
            });
    });
});

var port = process.env.port || 443; // porta a escutar

app.listen(port,'127.0.0.1'); // escuta na porta 443 para fazer uso do ssl do azure