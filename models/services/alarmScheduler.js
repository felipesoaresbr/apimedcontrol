const cron = require('node-cron');
const { Op } = require("sequelize");

const { Alarme, Medicamento } = require('../Medicamentos');

let io_global = null;
let devices_global = null;

const diasMap = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

const verificarAlarmes = async () => {

    if (!io_global || !devices_global) {
        console.log("[Scheduler] Aguardando inicialização do Socket.io...");
        return;
    }

    const agora = new Date();
    const horaAtual = agora.toTimeString().split(' ')[0];
    const diaAtual = diasMap[agora.getDay()];

    console.log(`[Scheduler] Verificando alarmes para ${horaAtual} no dia ${diaAtual}...`);

    try {
        const alarmesParaTocar = await Alarme.findAll({

            where: {
                hora: {
                    [Op.between]: [
                        horaAtual.substring(0, 5) + ":00",
                        horaAtual.substring(0, 5) + ":59"
                    ]
                },

                dias_semana: {
                    [Op.or]: [
                        { [Op.substring]: `%${diaAtual}%` },
                        { [Op.substring]: `%diariamente%` }
                    ]
                }
            },

            include: {
                model: Medicamento,
                as: 'medicamento',
                required: true
            }
        });

        if (alarmesParaTocar.length > 0) {
            console.log(`[Scheduler] ${alarmesParaTocar.length} alarme(s) encontrado(s)!`);

            for (const alarme of alarmesParaTocar) {

                const medicamento = alarme.medicamento;
                const userId = alarme.usuarioId;

                const deviceSocketId = devices_global[userId];

                if (deviceSocketId) {

                    const horaFormatada = alarme.hora.substring(0, 5);

                    const payloadString = [
                        medicamento.nome,
                        horaFormatada,
                        medicamento.compartimento_numero,
                        alarme.tipo,
                        alarme.quantidade_dose
                    ].join(',');

                    console.log(`[Scheduler] Enviando payload STRING para usuário ${userId}: "${payloadString}"`);

                    io_global.to(deviceSocketId).emit('disparar_alarme', payloadString);

                } else {
                    console.log(`[Scheduler] Usuário ${userId} está offline. Alarme perdido.`);
                }
            }
        }

    } catch (error) {
        console.error("[Scheduler] Erro ao verificar alarmes:", error);
    }
};

exports.start = (io, connectedDevices) => {
    io_global = io;
    devices_global = connectedDevices;

    cron.schedule('* * * * *', verificarAlarmes);
    console.log("[Scheduler] Agendador de alarmes iniciado. Verificando a cada minuto.");
};