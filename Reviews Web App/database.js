import mysql from 'mysql2/promise';
export let db;                   //variabile globale per la connessione al database, inizializzata nella funzione dbInit()

export async function dbInit(){  //inizializza la connessione al database
    db = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'recensioni'
    });

    console.log('Database connected');

    //crea la tabella users
    await db.execute(`CREATE TABLE IF NOT EXISTS users ( 
        username VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        nome VARCHAR(255) NOT NULL,
        cognome VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        ruolo VARCHAR(255) NOT NULL DEFAULT 'user'
    )`);

    //crea la tabella recensione
    await db.execute(`CREATE TABLE IF NOT EXISTS reviews ( 
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_username VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 10),
        comment TEXT,
        tipo TEXT,
        FOREIGN KEY (user_username) REFERENCES users(username)
    )`);



}