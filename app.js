const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
const httpServer = http.createServer(app);

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());

// ================================
// 🔹 Banco e Models
// ================================
const { Medicamento, Alarme, Usuario, sincronizarTabelas } = require("./models/Medicamentos");
const alarmScheduler = require("./models/services/alarmScheduler");

// ================================
// 🔹 Socket.IO
// ================================
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

let connectedDevices = {}; // { usuarioId: socket.id }

// Quando o socket se conecta:
io.on("connection", (socket) => {
    console.log(`[Socket] Novo dispositivo conectado: ${socket.id}`);

    // O app envia o ID do usuário depois do login
    socket.on("registrar_usuario", (usuarioId) => {
        connectedDevices[usuarioId] = socket.id;
        console.log(`[Socket] Usuário ${usuarioId} associado ao socket ${socket.id}`);
    });

    // Quando desconectar, removemos o ID
    socket.on("disconnect", () => {
        for (const [userId, socketId] of Object.entries(connectedDevices)) {
            if (socketId === socket.id) {
                delete connectedDevices[userId];
                console.log(`[Socket] Usuário ${userId} desconectado.`);
                break;
            }
        }
    });
});

// ================================
// 🔹 Rotas Express
// ================================
app.get("/", (req, res) => {
    res.send("🚀 Servidor MedControl rodando!");
});

// Registro de usuário
app.post("/usuarios/register", async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ error: "Preencha todos os campos." });
        }

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
        res.status(500).json({ error: "Erro ao cadastrar usuário: " + error.message });
    }
});

// Login
app.post("/usuarios/login", async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        if (!senhaCorreta) return res.status(401).json({ error: "Senha incorreta." });

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

// Cadastrar medicamento
app.post("/medicamentos", async (req, res) => {
    try {
        const novoMedicamento = await Medicamento.create(req.body);
        res.status(201).json({ message: "Success", data: novoMedicamento });
    } catch (error) {
        res.status(500).json({ error: "Erro ao cadastrar medicamento: " + error.message });
    }
});

// Cadastrar alarme
app.post("/medicamentos/:medicamentoId/alarmes", async (req, res) => {
    try {
        const { medicamentoId } = req.params;
        const { hora, dias_semana, tipo, quantidade_dose, usuarioId } = req.body;

        const medicamento = await Medicamento.findByPk(medicamentoId);
        if (!medicamento) return res.status(404).json({ message: "Medicamento não encontrado." });

        const novoAlarme = await Alarme.create({
            hora,
            dias_semana,
            tipo,
            quantidade_dose,
            medicamentoId: medicamento.id,
            usuarioId
        });

        res.status(201).json({ message: "Alarme cadastrado!", data: novoAlarme });
    } catch (error) {
        res.status(500).json({ error: "Erro ao cadastrar alarme: " + error.message });
    }
});

// Buscar medicamentos por usuário
app.get("/medicamentos/usuario/:usuarioId", async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const medicamentos = await Medicamento.findAll({
            where: { usuarioId },
            include: { model: Alarme, as: "alarmes" },
            order: [["createdAt", "DESC"]]
        });

        res.status(200).json(medicamentos);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar medicamentos: " + error.message });
    }
});

// Buscar alarmes por usuário
app.get("/alarmes/usuario/:usuarioId", async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const alarmes = await Alarme.findAll({
            where: { usuarioId },
            include: [
                {
                    model: Medicamento,
                    as: "medicamento",
                    attributes: ["id", "nome", "compartimento_numero"],
                },
            ],
            order: [["hora", "ASC"]],
        });

        res.status(200).json({ message: "Alarmes encontrados.", data: alarmes });
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar alarmes: " + error.message });
    }
});

// ================================
// 🔹 Inicialização do Servidor
// ================================
const PORTA = 8998;
httpServer.listen(PORTA, "0.0.0.0", async () => {
    console.log(`[Servidor] Rodando na porta ${PORTA}`);
    await sincronizarTabelas();
    alarmScheduler.start(io, connectedDevices);
});
