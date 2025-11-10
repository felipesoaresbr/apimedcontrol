const cron = require('node-cron');
const { Op } = require("sequelize");
const { Alarme, Medicamento } = require('../Medicamentos');

let io_global = null;
let devices_global = null;

const diasMap = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

const verificarAlarmes = async () => {
    if (!io_global || !devices_global) {
        console.log("[Scheduler] Aguardando inicialização...");
        return;
    }

    const agora = new Date();
    const horaAtual = agora.toTimeString().split(' ')[0];
    const diaAtual = diasMap[agora.getDay()];

    console.log(`[Scheduler] Verificando alarmes para ${horaAtual} (${diaAtual})`);

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
            include: { model: Medicamento, as: 'medicamento', required: true }
        });

        for (const alarme of alarmesParaTocar) {
            const { medicamento, usuarioId } = alarme;
            const socketId = devices_global[usuarioId];

            if (socketId) {
                const payloadString = [
                    medicamento.nome,
                    alarme.hora.substring(0, 5),
                    medicamento.compartimento_numero,
                    alarme.tipo,
                    alarme.quantidade_dose
                ].join(',');

                console.log(`[Scheduler] Enviando alarme ao usuário ${usuarioId}: "${payloadString}"`);
                io_global.to(socketId).emit("disparar_alarme", payloadString);
            } else {
                console.log(`[Scheduler] Usuário ${usuarioId} está offline. Alarme perdido.`);
            }
        }

    } catch (error) {
        console.error("[Scheduler] Erro ao verificar alarmes:", error);
    }
};

exports.start = (io, connectedDevices) => {
    io_global = io;
    devices_global = connectedDevices;
    cron.schedule("* * * * *", verificarAlarmes);
    console.log("[Scheduler] Agendador iniciado (executando a cada minuto).");
};
