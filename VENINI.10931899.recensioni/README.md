# Recensioni

Applicazione web per gestire recensioni di film, libri, ristoranti, videogiochi, corsi e tanto altro.

## Requisiti

- Node.js v25.8.2
- MySQL 8.0.45

## Installazione

1. Estrarre lo zip del progetto
2. Installare le dipendenze:
   npm install
3. Avviare MySQL e creare il database:
   CREATE DATABASE recensioni;
4. Avviare il server:
   node script.js
5. Aprire il browser su http://localhost:3000

## Note

L'utente admin non può essere registrato tramite l'applicazione ma deve essere aggiunto direttamente nel database con:

=>  UPDATE users SET ruolo = 'admin' WHERE username = 'prova';

## Funzionalità implementate

- Registrazione e autenticazione utenti con sessione
- Ruoli utente e amministratore
- Aggiunta, modifica ed eliminazione recensioni
- Catalogo diviso per categoria con media voti
- Ricerca per nome prodotto o tipo
- Pagina prodotto con tutte le recensioni e media voti
- Validazione degli input lato server
- Protezione delle route con middleware