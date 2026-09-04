# Usadão Máquinas — Back-end V1

## O que esta versão já faz
- Servidor Node.js + Express
- Banco SQLite local
- API de equipamentos
- Cadastro, consulta, edição e exclusão por API
- Painel administrativo simples em /admin
- Um equipamento de exemplo para teste

## Como iniciar no computador
1. Instale o Node.js (versão LTS).
2. Abra o terminal nesta pasta.
3. Rode: npm install
4. Depois: npm start
5. Abra: http://localhost:3000/admin

## Importante
Esta é uma V1 de desenvolvimento. Ainda NÃO tem:
- login seguro de administrador;
- usuários reais;
- sistema real de lances;
- pagamento PIX real;
- gateway de pagamento;
- hospedagem de produção.

Não coloque chaves de API, senhas bancárias ou credenciais reais neste projeto de teste.


## V2 integrada
- `/` abre o site público `index.html`.
- `/admin` abre o painel administrativo.
- O site público busca automaticamente equipamentos com status `publicado` na API.
- A cada 15 segundos a lista é atualizada.
- O arquivo `usadao.db` continua local e não deve ser apagado.
