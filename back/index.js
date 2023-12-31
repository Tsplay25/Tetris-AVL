require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.use(express.json());
app.use(cors());

app.listen(3000, () => {
    console.log('Servidor na porta 3000');
});

const User = require('./User');

app.use(express.urlencoded({ extended: true }));

app.post('/login', async (req, res) => {
    const { nickname, password } = req.body;
    const jsonPath = path.join(
        __dirname,
        '.',
        'db',
        'banco-dados-usuario.json'
    );
    const data = JSON.parse(
        fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
    );

    //verifica se existe usuario com o nick digitado
    for (let user of data) {
        if (user.nickname === nickname) {
            if (password && user.password) {
                const senhaValidada = await bcrypt.compare(
                    password,
                    user.password
                );
                if (senhaValidada) {
                    const token = jwt.sign(user, process.env.TOKEN);
                    console.log('usuario validado');
                    return res.json({ user: user, token: token });
                } else
                    return res.status(422).send(`Usuario ou senha incorretos.`);
            } else {
                return res.status(500).send(`Erro interno no servidor.`);
            }
        }
    }
    return res
        .status(409)
        .send(
            `Usuario com nick ${nickname} não existe. Considere criar uma conta!`
        );
});

app.post('/create', async (req, res) => {
    const { nickname, email, password } = req.body;
    const jsonPath = path.join(
        __dirname,
        '.',
        'db',
        'banco-dados-usuario.json'
    );
    const data = JSON.parse(
        fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
    );
    for (let user of data) {
        if (user.email === email) {
            return res
                .status(409)
                .send(`Usuario com email ${email} já existe.`);
        }
    }
    const id = data.length + 1;

    const salt = await bcrypt.genSalt(10);
    const senhaCrypt = await bcrypt.hash(password, salt);

    const novo = new User(id, nickname, email, senhaCrypt);
    data.push(novo);
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    res.send(`Usuário criado com sucesso.`);
});

app.get('/game', verificaToken, (req, res) => {
    const jsonPath = path.join(
        __dirname,
        '.',
        'db',
        'banco-dados-usuario.json'
    );
    const users = JSON.parse(
        fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
    );

    return res.json(users);
});

app.get('/profile', verificaToken, (req, res) => {
    const jsonPath = path.join(
        __dirname,
        '.',
        'db',
        'banco-dados-usuario.json'
    );
    const users = JSON.parse(
        fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
    );

    return res.json(users);
});

function verificaToken(req, res, next) {
    const authHeaders = req.headers['authorization'];

    const token = authHeaders && authHeaders.split(' ')[1];
    //Bearer token

    if (token == null) return res.status(401).send('Acesso Negado');

    jwt.verify(token, process.env.TOKEN, (err) => {
        if (err) return res.status(403).send('Token Inválido/Expirado');
        next();
    });
}

app.delete('/profile', verificaToken, async (req, res) => {
    console.log('req body', req.body);
    try {
        const userId = req.body.id;
        const jsonPath = path.join(
            __dirname,
            '.',
            'db',
            'banco-dados-usuario.json'
        );
        const users = JSON.parse(
            fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
        );
        console.log('users: ', users);
        //Encontra o usuário pelo ID
        const userIndex = users.findIndex((u) => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).send('Usuário não encontrado');
        }

        // Encontra e exclue o usuário no array de usuários
        users.splice(userIndex, 1);
        for (let user of users) {
            if (user.id > userIndex) user.id = user.id - 1;
        }

        // Salva as alterações de volta no arquivo JSON
        fs.writeFileSync(jsonPath, JSON.stringify(users, null, 2), 'utf-8');

        // Envia uma resposta de volta ao cliente
        return res.send('Usuário excluído com sucesso');
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        return res.status(500).send('Erro ao processar a solicitação');
    }
});

app.put('/profile', async (req, res) => {
    console.log(req.body.userId);
    const { userId, newEmail, newNickname, newPassword, confirmPassword } =
        req.body;
    const jsonPath = path.join(
        __dirname,
        '.',
        'db',
        'banco-dados-usuario.json'
    );
    const data = JSON.parse(
        fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
    );

    const userIndex = data.findIndex((u) => u.id === userId);
    console.log('userIndex: ', userIndex);

    if (userIndex !== -1) {
        // Erro caso as senhas sejam diferentes
        if (newPassword !== confirmPassword) {
            return res
                .status(400)
                .json({
                    message:
                        'A nova senha e a confirmação de senha não coincidem',
                });
        }
        // Modifica as informações do usuário
        data[userIndex].nickname =
            req.body.newNickname || data[userIndex].nickname;
        data[userIndex].email = req.body.newEmail || data[userIndex].email;
        const salt = await bcrypt.genSalt(10);
        const senhaCrypt = await bcrypt.hash(req.body.newPassword, salt);
        data[userIndex].password = senhaCrypt || data[userIndex].password;

        // Salva as alterações de volta no arquivo JSON
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), {
            encoding: 'utf8',
            flag: 'w',
        });

        return res
            .status(200)
            .json('Informações do usuário modificadas com sucesso');
    }
});

app.put('/rate', async (req, res) => {
    try {
        const userId = req.body.userId;
        const rating = req.body.rating;
        const jsonPath = path.join(
            __dirname,
            '.',
            'db',
            'banco-dados-usuario.json'
        );
        const users = JSON.parse(
            fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
        );

        if (userId) {
            // Atualizar a avaliação do usuário
            users[userId - 1].rating = rating;

            fs.writeFileSync(jsonPath, JSON.stringify(users, null, 2), {
                encoding: 'utf8',
                flag: 'w',
            });

            return res
                .status(200)
                .json({
                    success: true,
                    message: 'Avaliação salva com sucesso.',
                });
        } else {
            return res
                .status(404)
                .json({ success: false, message: 'Usuário não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao avaliar:', error);
    }
});

app.post('/score', async (req, res) => {
    try {
        const score = req.body.score.points;
        const lines = req.body.score.lines;
        const userId = req.body.id;
        const jsonPath = path.join(
            __dirname,
            '.',
            'db',
            'banco-dados-usuario.json'
        );
        const users = JSON.parse(
            fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
        );

        if (userId) {
            // Atualizar a avaliação do usuário
            users[userId - 1].score = score;
            users[userId - 1].lines = lines;
            console.log(users[userId - 1]);
            fs.writeFileSync(jsonPath, JSON.stringify(users, null, 2), {
                encoding: 'utf8',
                flag: 'w',
            });

            return res
                .status(200)
                .json({ success: true, message: 'Score atualizado' });
        } else {
            return res
                .status(404)
                .json({ success: false, message: 'Usuário não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao avaliar:', error);
    }
});

app.get('/score', (req, res) => {
    const jsonPath = path.join(
        __dirname,
        '.',
        'db',
        'banco-dados-usuario.json'
    );
    const data = JSON.parse(
        fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
    );
    const userId = req.headers.id;

    try {
        if (userId) {
            const { score, lines } = data[userId - 1];
            console.log({ score, lines });
            return res.json({ score, lines });
        } else {
            res.status(404).send(
                `Usuário com ID ${userId} não encontrado no arquivo`
            );
        }
    } catch (parseError) {
        console.error('Erro ao analisar o JSON:', parseError);
    }
});

app.get('/ranking', (req, res) => {
    console.log(req.headers);
    try {
        const jsonPath = path.join(
            __dirname,
            '.',
            'db',
            'banco-dados-usuario.json'
        );
        const data = JSON.parse(
            fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' })
        );
        const usesTop = data.sort((a, b) => b.score - a.score);
        console.log(usesTop);

        const top3 = usesTop
            .slice(0, 3)
            .map((user) => ({ nickname: user.nickname, score: user.score }));
        console.log(top3);
        return res.json(top3);
    } catch (error) {
        console.error('Erro ao ler o arquivo JSON:', error.message);
    }
});
