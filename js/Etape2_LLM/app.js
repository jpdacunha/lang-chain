// Utiliser l'API de Groq
import { ChatGroq } from "@langchain/groq";
// Utiliser l'API de OpenAI
// import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";

// Importer les variables d'environnement
dotenv.config();

// Créer une instance de ChatGroq pour parler à l'IA / au llm de notre choix
const chat = new ChatGroq({
    model: "llama-3.2-3b-preview",
    // apiKey: "xxxxxxxxxxxxxxx",
    temperature: 0.3,
    streaming: true,
    verbose: true,
    maxTokens: 1000,
});

// Appeler le modèle pour obtenir une réponse
//const response = await chat.invoke("Hello!");
//console.log(response.content);

const response = await chat.stream("1+1?");

for await (const message of response) {
    console.log(message?.content);
}
