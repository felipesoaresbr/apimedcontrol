const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require('bcryptjs');
const cors = require('cors');
const httpServer = http.createServer(app);

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

const io = new Server(httpServer, {
    cors: { origin: "*" }
});

const { Medicamento, Alarme, Usuario, sincronizarTabelas } = require("./models/Medicamentos");

const alarmScheduler = require("./models/services/alarmScheduler");

app.use(express.json());
app.get("/", function (req, res) {
    res.send("Seja Bem-vindo ao MedControl");
});

app.post("/usuarios/register", async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ error: "Preencha todos os campos." });
        }

        // Verifica se já existe usuário com o mesmo e-mail
        const usuarioExistente = await Usuario.findOne({ where: { email } });
        if (usuarioExistente) {
            return res.status(409).json({ error: "E-mail já cadastrado." });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoUsuario = await Usuario.create({
            nome,
            email,
            senha: senhaHash,
        });

        res.status(201).json({ message: "Success", data: novoUsuario });
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ error: "Erro ao cadastrar usuário: " + error.message });
    }
});



app.post("/usuarios/login", async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ where: { email: email } });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ error: "Senha incorreta." });
        }

        res.status(200).json({
            message: "Success",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao fazer login: " + error.message });
    }
});

app.post("/medicamentos", async (req, res) => {
    try {
        const novoMedicamento = await Medicamento.create(req.body);
        res.status(201).json({ message: "Success", data: novoMedicamento });
    } catch (error) {
        res.status(500).json({ error: "Erro ao cadastrar medicamento: " + error.message });
    }
});

app.post("/medicamentos/:medicamentoId/alarmes", async (req, res) => {
    try {
        const { medicamentoId } = req.params;
        const { hora, dias_semana, tipo, quantidade_dose, usuarioId } = req.body;

        const medicamento = await Medicamento.findByPk(medicamentoId);
        if (!medicamento) {
            return res.status(404).json({ message: "Medicamento não encontrado." });
        }

        const novoAlarme = await Alarme.create({
            hora,
            dias_semana,
            tipo,
            quantidade_dose,
            medicamentoId: medicamento.id,
            usuarioId // 🔹 vincula o alarme ao usuário
        });

        res.status(201).json({ message: "Alarme cadastrado!", data: novoAlarme });
    } catch (error) {
        res.status(500).json({ error: "Erro ao cadastrar alarme: " + error.message });
    }
});


app.get("/medicamentos", async (req, res) => { /* ... (código antigo) ... */ });
app.get("/medicamentos/:id", async (req, res) => { /* ... (código antigo) ... */ });

app.get("/medicamentos/usuario/:usuarioId", async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const medicamentosDoUsuario = await Medicamento.findAll({
            where: {
                usuarioId: usuarioId
            },

            include: {
                model: Alarme,
                as: 'alarmes'
            },
            order: [
                ['createdAt', 'DESC']
            ]
        });

        res.status(200).json(medicamentosDoUsuario);

    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar medicamentos do usuário: " + error.message });
    }
});

// 🔹 Rota para buscar todos os alarmes de um determinado medicamento
app.get("/medicamentos/:medicamentoId/alarmes", async (req, res) => {
    try {
        const { medicamentoId } = req.params;

        // Busca todos os alarmes associados a esse medicamento
        const alarmes = await Alarme.findAll({
            where: { medicamentoId },
            order: [["hora", "ASC"]], // ordena pelos horários crescentes
        });

        // Se não houver alarmes cadastrados
        if (!alarmes || alarmes.length === 0) {
            return res.status(404).json({
                message: "Nenhum alarme encontrado para este medicamento.",
                data: [],
            });
        }

        // Retorna todos os alarmes encontrados
        res.status(200).json({
            message: "Alarmes encontrados.",
            data: alarmes,
        });
    } catch (error) {
        console.error("Erro ao buscar alarmes:", error);
        res.status(500).json({
            error: "Erro ao buscar alarmes: " + error.message,
        });
    }
});

app.delete("/alarmes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const alarme = await Alarme.findByPk(id);
        if (!alarme) {
            return res.status(404).json({ error: "Alarme não encontrado." });
        }

        await alarme.destroy();

        res.status(200).json({ message: "Success" });

    } catch (error) {
        res.status(500).json({ error: "Erro ao deletar alarme: " + error.message });
    }

});

app.get("/alarmes/usuario/:usuarioId", async (req, res) => {
    try {
        const { usuarioId } = req.params;

        // Busca todos os alarmes vinculados a esse usuário,
        // incluindo o medicamento associado (opcional, mas útil pra exibir nome)
        const alarmes = await Alarme.findAll({
            where: { usuarioId },
            include: [
                {
                    model: Medicamento,
                    as: "medicamento",
                    attributes: ["id", "nome", "compartimento_numero"], // traga só o necessário
                },
            ],
            order: [
                ["hora", "ASC"], // ordena pelos horários dos alarmes
            ],
        });

        if (!alarmes || alarmes.length === 0) {
            return res.status(404).json({
                message: "Nenhum alarme encontrado para este usuário.",
                data: [],
            });
        }

        res.status(200).json({
            message: "Alarmes encontrados.",
            data: alarmes,
        });
    } catch (error) {
        console.error("Erro ao buscar alarmes por usuário:", error);
        res.status(500).json({
            error: "Erro ao buscar alarmes por usuário: " + error.message,
        });
    }
});



let connectedDevices = {};
io.on('connection', (socket) => { /* ... (código antigo) ... */ });


const PORTA = 8998;
httpServer.listen(PORTA, "0.0.0.0", async () => {
    console.log(`[Servidor] Rodando na porta ${PORTA}`);

    await sincronizarTabelas();

    alarmScheduler.start(io, connectedDevices);
});