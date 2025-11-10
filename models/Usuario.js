const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const db = require('./db.js');

const sequelize = db.sequelize;
const Sequelize = db.Sequelize;

const Usuario = sequelize.define('usuarios', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true 
    },
    senha: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true,
});

module.exports = Usuario;