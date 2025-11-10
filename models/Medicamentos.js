const db = require('./db.js');
const Sequelize = db.Sequelize;
const sequelize = db.sequelize;
const DataTypes = Sequelize.DataTypes;

const Alarme = require('./Alarme');
const Usuario = require('./Usuario');

const Medicamento = sequelize.define('medicamentos', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // --------------------------
    compartimento_numero: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantidade_total: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    quantidade_atual: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    info_bula: {
        type: DataTypes.TEXT,
        allowNull: true
    },
}, {
    timestamps: true,
    tableName: 'medicamentos'
});

Usuario.hasMany(Medicamento, { as: 'medicamentos', foreignKey: 'usuarioId' });
Medicamento.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuarioId' });

// 🔹 relacionamento de Medicamento → Alarmes
Medicamento.hasMany(Alarme, { as: 'alarmes', foreignKey: 'medicamentoId' });
Alarme.belongsTo(Medicamento, { as: 'medicamento', foreignKey: 'medicamentoId' });

// 🔹 relacionamento direto de Usuario → Alarmes
Usuario.hasMany(Alarme, { as: 'alarmes', foreignKey: 'usuarioId' });
Alarme.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuarioId' });


const sincronizarTabelas = async () => {
    try {
        // Sincroniza em ordem (com 'force: false')
        await Usuario.sync({ force: false });
        await Medicamento.sync({ force: false });
        await Alarme.sync({ force: false });

        console.log("[Sync] Todas as tabelas foram sincronizadas com sucesso.");
    } catch (error) {
        console.error("[Sync] Erro ao sincronizar tabelas:", error);
    }
};

module.exports = {
    Medicamento,
    Usuario,
    Alarme,
    sincronizarTabelas
};