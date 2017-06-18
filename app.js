var express = require('express');
var app = express();
var mongoose  = require('mongoose');
var bodyparser = require('body-parser');
var path = require('path');

app.set('view engine','pug'); // Indica que iremos usar o pugjs para mostrar as paginas -> www.pugjs.org

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

var Veiculos = mongoose.model('Veiculos',veiculosSchema,'Veiculos');

//Rota principal/Home
app.get('/',function(req,res){
	res.render('index'); //  Mostra a pagina index.pug
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
        console.log(veiculos);
        res.render('veiculos',{'veiculos':veiculos}); // Mostra a pagina com os veiculos do tipo de veiculo definido no url
    });
});

// Mostra pagina com formulario de adicionar carros
app.get('/veiculos/:tipoVeiculo/add',function(req,res){
   res.render('addveiculo' , {'tipo':req.params.tipoVeiculo}); // envia para a pagina com formulario o tipo de veiculo para preencher o campo tipo de veiculo
});

// Adiciona Veiculos
app.post('/veiculos/:tipoVeiculo',function(req,res){
    var tipoVeiculo = req.params.tipoVeiculo;   //valor que vem do url :tipoVeiculo que indica qual o tipo de veiculo estamos a trabalhar
    
    if(tipoVeiculo == req.body.tipo){ // Verifica se o novo veiculo e do mesmo tipo que o indicado no url
        var veiculo = new Veiculos();
        veiculo.Marca = req.body.marca; // valor da marca que vem do formulario
        veiculo.Modelo = req.body.modelo; // valor do modelo que vem do formulario
        veiculo.Tipo = req.body.tipo; // valor do tipo que vem do formulario
        veiculo.Preco = req.body.preco; // valor do preco que vem do formulario
        console.log(req.body.imagem); // valor da imagem que vem do formulario

        veiculo.save(function(err,vei){ // Guarda novo veiculo
            if(vei)
                console.log('Veiculo '+vei._id+' adicionado!'); // log do id do novo veiculo adicionado a bd
            else
                console.log('Erro ao criar novo Veiculo'); // log do erro ao adicionar novo veiculo a bd
        });
    }else{
        res.status(500).send('Veiculo nao adicionado!'); // Mostrar mensagem de erro aos utilizadores.
    }
});

var port = process.env.port || 443;

app.listen('13.81.108.99',port); // escuta na porta 80