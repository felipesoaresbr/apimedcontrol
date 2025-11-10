const db = require('./db.js');
const Sequelize = db.Sequelize;
const sequelize = db.sequelize;
const DataTypes = Sequelize.DataTypes;

const Alarme = sequelize.define('alarmes', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    hora: {
        type: DataTypes.TIME,
        allowNull: false
    },
    dias_semana: {
        type: DataTypes.JSON,
        allowNull: false
    },
    tipo: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "Comprimido"
    },
    quantidade_dose: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "1"
    },
    // 🔹 adiciona as FKs aqui (elas só criam a coluna, o vínculo vem nas associações)
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios', // nome da tabela referenciada
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    medicamentoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'medicamentos',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    }
}, {
    timestamps: false,
    tableName: 'alarmes'
});

module.exports = Alarme;
