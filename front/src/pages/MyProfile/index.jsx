import { useState, useEffect } from 'react'
import axios from 'axios';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { Link } from 'react-router-dom';
import goBackIcon from '../../assets/icons/goBack.png';
import './MyProfile.css';
import { useAuth } from '../../contexts/AuthContext';

export default function MyProfile() {
    const [validate, setValidate] = useState(false);
    const user = useAuth();

    const config = {
        headers: {
            Authorization: 'Bearer '.concat(sessionStorage.getItem('token')),
        },
    };

    useEffect(() => {
        async function valida() {
            try {
                const resposta = await axios.get(
                    "http://localhost:3000/profile",
                    config
                );
                console.log(resposta.status);
                if (resposta.status === 200) setValidate(true);
            } catch (error) {
                console.log(error);
                setValidate(false);
            }
        }
        valida();
    }, []);

    if(!validate){
        return <p>Token Inválido, faça login!</p>
    }

    const handleDeleteUser = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.delete("http://localhost:3000/profile", {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // Adiciona o token de autorização
                },
            });
    
            console.log(response.data.message); // Mensagem do servidor
        } catch (error) {
            console.log('Erro ao excluir usuário:', error.response?.data || error.message);
        }
    };

    return (
        <main className="main">
            <section className="myProfile">
                <div className="titleContainer">
                    <Link to="/game">
                        <img src={goBackIcon} id="goBackBtn" />
                    </Link>
                    <h1>Meu Perfil</h1>
                </div>
                <form action="" className="changeData">
                    <FormField
                        label="Email:"
                        htmlFor="email"
                        type="text"
                        placeholder="Digite seu email..."
                    />
                    <FormField
                        label="Nickname:"
                        htmlFor="nickname"
                        type="text"
                        placeholder="Digite seu apelido..."
                    />
                    <FormField
                        label="Senha:"
                        htmlFor="password"
                        type="text"
                        placeholder="Digite uma nova senha..."
                    />
                    <FormField
                        label="Confirme sua senha:"
                        htmlFor="passwordConfirm"
                        type="text"
                        placeholder="Digite sua senha novamente..."
                    />

                    <Button text="Alterar dados" type="submit" />
                </form>
                <div className="removeAccount">
                    <h2>Remova sua conta:</h2>
                    <Button text="Remover conta" type="button" func={handleDeleteUser}/>
                </div>
            </section>
        </main>
    );
}
