import express from 'express';
import session from 'express-session';
import {dbInit, db} from './database.js';


const app = express();                          //crea un'app Express per gestire le richieste HTTP e le risposte del server

app.set('view engine', 'ejs');                  //imposta EJS come motore di template per generare le pagine HTML dinamicamente
app.use(express.urlencoded({extended: true}));  //per poter leggere i dati inviati tramite form (req.body) e extended: true permette di leggere anche oggetti annidati
app.use(express.static('public'));              //per servire i file statici (css) dalla cartella "public"
app.use(session({
    secret: 'recensioni-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60}            //1 ora
}));

await dbInit();                                //inizializza la connessione al database e crea le tabelle se non esistono
app.listen(3000, () => console.log('Server su http://localhost:3000'));  //avvisa il server e stampa un messaggio

//-----MIDDLEWARE-----

//  per verificare se l utente e autenticato

function isAuthenticated(req, res, next){
    if(req.session.username){
        return next();
    }
    res.redirect('/');
}

// per rendere username,ruolo disponibile in tutte le view

app.use((req, res, next) => {
    res.locals.sessionUser = req.session.username || null;  //rende disponibile la variabile sessionUser in tutte le view, con il valore della sessione o null se non autenticato
    res.locals.sessionRuolo = req.session.ruolo || null;  //rende il ruolo disponibile in tutte le view
    next();
});


//REGISTRAZIONE E LOGIN

app.get('/register', (req, res) => { res.render('register', { error: null } );  //per mostrare la pagina di registrazione
});
app.post('/register', async (req, res) => {  //per gestire la registrazione di un nuovo utente
    const {username, nome, cognome, email, password} = req.body;
    console.log('Dati ricevuti:', req.body); // per vedere cosa non va
    if(!username || !nome || !cognome || !email || !password){
        return res.render('register', {error: 'Tutti i campi sono obbligatori'});
    }

    if(password.length < 8){
        return res.render('register', {error: 'La password deve essere lunga almeno 8 caratteri'});
    }

    try{
        await db.execute(`INSERT INTO users (username, nome, cognome, email, password) VALUES (?, ?, ?, ?, ?)`,
        [username, nome, cognome, email, password]);
        req.session.username=username;
        res.redirect('/');
    }catch(err){
        console.error('Errore registrazione:', err.code, err.message); // <-- più dettagli
        if(err.code === 'ER_DUP_ENTRY'){    //se l'errore è dovuto a un username già esistente
            return res.render('register', {error: 'Username già esistente'});
        }
        console.error(err);
        res.render('register', {error: 'Errore durante la registrazione'});
    }
    });

    //login

    app.get('/login', (req, res) => { res.render('login', { error: null } );  //per mostrare la pagina di login
});
    app.post('/login', async (req, res) => {  //per gestire il login di un utente esistente
        const {username, password} = req.body;
        const [rows] = await db.execute(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password]);
        if(rows.length === 0){
            return res.render('login', {error: 'Username o password errati'});
        }
        req.session.username = username;
        req.session.ruolo = rows[0].ruolo;  // salva il ruolo
        res.redirect('/');
    });

    app.get('/logout', (req, res) => {  //per gestire il logout dell'utente
        req.session.destroy();
        res.redirect('/login');
    });

    //  per la home
    app.get('/', async (req, res) => {
        const[review] = await db.execute(`SELECT reviews.* 
                                          FROM reviews ORDER BY reviews.id DESC`);
    res.render('index', {review});
});

    app.get("/nuovaRecensione", (req,res)=> {
        res.render("nuovaRecensione", {error: null})
    });

//per nuova recensione
    app.post("/nuovaRecensione", isAuthenticated, async (req,res) =>{
    const username = req.session.username;
    const{titolo,descrizione,valutazione,tipo} = req.body;
    
    if(!titolo || !descrizione || !valutazione || !tipo){
    return res.render('nuovaRecensione', {error: 'Compilare tutti i campi'});
 }
    if(valutazione>10){
    return res.render('nuovaRecensione', {error: 'La valutazione deve essere compresa tra 0 e 10'});
}
    try{
    await db.execute(`INSERT INTO reviews (user_username,product_name,comment,rating,tipo) VALUES(?,?,?,?,?)`,
        [username, titolo, descrizione, valutazione, tipo]);
        res.redirect("/");
    
    }catch(err){
        console.error(err);
        res.render('nuovaRecensione', {error: 'Errore durante la pubblicazione della recensione'});
    }
    });

//per visualizzare la recensione selezionata

app.get("/recensione/:id", async (req,res) =>{
    const[review] = await db.execute(`SELECT reviews.* FROM reviews
                                      WHERE reviews.id=?`,[req.params.id]);
    res.render('recensione', {review: review[0]});
});
    

//ricerca

app.get('/ricerca', async (req, res) => {
    try {
        const search = req.query.search || '';
        const [review] = await db.execute(`
            SELECT reviews.*
            FROM reviews 
            WHERE reviews.tipo LIKE ? OR reviews.product_name LIKE ?
            ORDER BY reviews.id DESC
        `, [`%${search}%`,`%${search}%`]);
        res.render('ricerca', {review, search});
    } catch(err) {
        console.error(err);
        res.render('ricerca', {review: [], search: ''});
    }
});

//per il singolo elemento recensito
app.get('/oggetto/:product_name', async (req, res) => {
    try {
        const product_name = req.params.product_name;
        const [reviews] = await db.execute(`
            SELECT reviews.*
            FROM reviews
            WHERE LOWER(reviews.product_name) = LOWER(?)
            ORDER BY reviews.id DESC
        `, [product_name]);

        if(reviews.length === 0) return res.redirect('/');

        const media = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

        res.render('oggetto', {reviews, product_name, media});
    } catch(err) {
        console.error(err);
        res.redirect('/');
    }
});

//per visualizzare le tue recensioni
app.get("/visualizzaLeTueRecensioni", isAuthenticated, async (req,res) => {
    const username = req.session.username;
    const [MieReview] = await db.execute(`
        SELECT reviews.*
        FROM reviews
        WHERE reviews.user_username = ?`,
    [username]);

    res.render('visualizzaLeTueRecensioni', {username,MieReview});
});

//per eliminare recensioni (usato sia da users nelle proprie che da admin per tutte)

app.get("/elimina/:id", isAuthenticated, async (req, res) => {
    try {
        if(req.session.ruolo === 'admin'){
            await db.execute(`DELETE FROM reviews WHERE id = ?`, [req.params.id]);
            res.redirect('/');
        } else {
            await db.execute(`DELETE FROM reviews WHERE id = ? AND user_username = ?`, [req.params.id, req.session.username]);
            res.redirect('/visualizzaLeTueRecensioni');
        }
    } catch(err) {
        console.error(err);
        res.redirect('/');
    }
});

app.get("/modificaRecensioni/:id", isAuthenticated, async (req, res) => {
    try {
        if(req.session.ruolo === 'admin'){
            const [mod] = await db.execute(`SELECT * FROM reviews WHERE id = ?`, [req.params.id]);
            if(mod.length === 0) return res.redirect('/');
            return res.render('modificaRecensioni', {review: mod[0], error: null});
        } else {
            const [mod] = await db.execute(`SELECT * FROM reviews WHERE id = ? AND user_username = ?`, [req.params.id, req.session.username]);
            if(mod.length === 0) return res.redirect('/visualizzaLeTueRecensioni');
            res.render('modificaRecensioni', {review: mod[0], error: null});
        }
    } catch(err) {
        console.error(err);
        res.redirect('/');
    }
}); 

//per salvare la modifica definitiva
app.post("/modificaRecensioni/:id", isAuthenticated, async (req,res) =>{
    const{titolo,descrizione,valutazione,tipo} = req.body;
    await db.execute(`UPDATE reviews SET product_name = ?, comment = ?, rating = ?, tipo = ?
                      WHERE id = ?`,[titolo,descrizione,valutazione,tipo,req.params.id]);
    if(req.session.ruolo === 'admin'){
        res.redirect('/');
    }else{
    res.redirect('/visualizzaLeTueRecensioni');
    }
});

//per cataloghi 
app.get("/catalogo/:tipo", async (req, res) => {
    const tipo = req.params.tipo;
    const [reviews] = await db.execute(`
        SELECT product_name, AVG(rating) as media, COUNT(*) as totale
        FROM reviews
        WHERE LOWER(tipo) LIKE LOWER(?)
        GROUP BY product_name
        ORDER BY media DESC
    `, [tipo]);
    res.render('catalogo', {reviews, tipo});
});