
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as dotenv from "dotenv";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import express from 'express';

dotenv.config();

const app = express();
const port = 3000;

// Add CORS headers
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

const chat = new ChatGroq({
    model: process.env.GROQ_MODEL_NAME,
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0,
});

let chatHistory = [];

const getRecentHistory = (history) => {
    return history.slice(-6);
};

app.post('/chat', async (req, res) => {

    try {
        const userMessage = req.body.message;
        const response = await chat.invoke([
            new SystemMessage("You are a helpful assistant."),
            ...getRecentHistory(chatHistory),
            new HumanMessage(userMessage)
        ]);

        chatHistory.push(new HumanMessage(userMessage))
        chatHistory.push(new AIMessage(response.content));
        
        res.json({ response: response.content });
    }  catch (error) {
        console.error("Error processing chat request:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }       

});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
