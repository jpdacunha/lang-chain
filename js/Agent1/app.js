import { ChatGroq } from "@langchain/groq";
import * as dotenv from "dotenv";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import express from 'express';
import { SYSTEM_PROMPT } from './systemPrompt.js';
dotenv.config();

// Express
const app = express();
const port = 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.static('.'));
app.use(express.json());

// Tools
const addTool = (a, b) => a + b;
const multiplyTool = (a, b) => a * b;
const temperatureTool = (cityCode) => {
    // Appeler l'url en get https://api.meteo-concept.com/api/forecast/daily?token=xxxxxxxx&insee=35238
    // doc: https://api.meteo-concept.com/documentation#forecast-city
    const apiMeteoToken = process.env.WEATHER_API_TOKEN;
    return fetch(`https://api.meteo-concept.com/api/forecast/daily?token=${apiMeteoToken}&insee=${cityCode}`)
        .then(response => response.json())
        .then(data => "Temperature minimum: "+ data.forecast[0].tmin + " Temperature maximum: "+ data.forecast[0].tmax)
        .catch(error => {
            console.error('Error fetching temperature:', error);
            return null;
        });
}
const getEmployeesInfosTool = () => {
    return fetch(`https://www.anthony-cardinale.fr/_placeholder/employees.json`)
        .then(response => response.json())
        .then(data => data)
        .catch(error => {
            console.error('Error fetching employees:', error);
            return null;
        });
}
const postToDiscordTool = () => {
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    return fetch(discordWebhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'TEST' })
    })
    .then(response => response.ok)
    .catch(error => {
        console.error('Error posting to Discord:', error);
        return false;
    });
}

const chat = new ChatGroq({
    model: process.env.CHAT_MODEL_NAME || "llama-3.2-3b-preview",
    temperature: 0,
});

const MAX_HISTORY_SIZE = 6;
let chatHistory = [];

const getRecentHistory = () => {
    return chatHistory;
};

const addMessageToHistory = (message) => {
    if (chatHistory.length >= MAX_HISTORY_SIZE) {
        chatHistory.shift();
    }
    chatHistory.push(message);
};

const isJsonString = (str) => {
    try {
        const json = JSON.parse(str);
        return typeof json === 'object' && json !== null;
    } catch (e) {
        return false;
    }
};

app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const messages = [
            new SystemMessage(SYSTEM_PROMPT),
            ...getRecentHistory(chatHistory),
            new HumanMessage(userMessage),
        ];

        const response = await chat.invoke(messages);
        const content = response.content.trim();
        addMessageToHistory(new HumanMessage(userMessage));

        if (isJsonString(content)) {
            // Traitement des réponses JSON (appels d'outils)
            const jsonResponse = JSON.parse(content);
            
            const toolMapping = {
                addTool: async () => ({ response: await addTool(...jsonResponse.args) }),
                multiplyTool: async () => ({ response: await multiplyTool(...jsonResponse.args) }),
                temperatureTool: async () => ({ response: await temperatureTool(...jsonResponse.args) }),
                postToDiscordTool: async () => {
                    const success = await postToDiscordTool();
                    return { response: success ? "Message envoyé avec succès" : "Échec de l'envoi" };
                },
                getEmployeesInfosTool: async () => {
                    const employeesData = await getEmployeesInfosTool();
                    const result = JSON.stringify(employeesData);
                    const messages = [
                        new SystemMessage(SYSTEM_PROMPT),
                        ...getRecentHistory(chatHistory),
                        new HumanMessage(userMessage + "\nUse following datas to answer the question: " + result + "\nDO NOT USE JSON FORMAT FOR THIS SPECIFIC ANSWER")
                    ];
                    const newResponse = await chat.invoke(messages);
                    const finalContent = newResponse.content.trim();
                    addMessageToHistory(new AIMessage({ content: finalContent }));
                    return { response: finalContent };
                }
            };

            if (!toolMapping[jsonResponse.tool]) {
                throw new Error('Unknown tool');
            }

            const toolResult = await toolMapping[jsonResponse.tool]();
            addMessageToHistory(new AIMessage({ content: toolResult.response.toString() }));
            return res.json({ response: toolResult.response });
        } else {
            // Traitement "normal" avec texte simple
            addMessageToHistory(new AIMessage({ content }));
            res.json({ response: content });
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Syntax Error:', error);
            res.status(400).json({ error: 'Invalid JSON format' });
        } else if (error instanceof TypeError) {
            console.error('Type Error:', error);
            res.status(400).json({ error: 'Type error occurred' });
        } else if (error.message === 'Unknown tool') {
            console.error('Unknown Tool Error:', error);
            res.status(400).json({ error: 'Unknown tool specified' });
        } else {
            console.error('Unexpected Error:', error);
            res.status(500).json({ error: 'An unexpected error occurred' });
        }
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

