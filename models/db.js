const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config()

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER,   process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    timezone: '-03:00',
    dialectOptions: {
        dateStrings: true,
        typeCast: true
    }
});

sequelize.authenticate()
    .then(() => {
        console.log('[db.js] Conexão com o banco de dados foi estabelecida com sucesso.');
    })
    .catch(err => {
        console.error('[db.js] Não foi possível conectar ao banco de dados:', err);
    });

module.exports = {
    Sequelize: Sequelize,
    sequelize: sequelize
}